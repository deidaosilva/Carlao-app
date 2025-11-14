
/**
 * Printer-server for Windows (Epson TM-T20 via USB)
 * Uses node-thermal-printer to send formatted receipts to a Windows-installed printer.
 *
 * BEFORE RUNNING:
 * 1) Install Node.js on the Windows machine.
 * 2) Install the Epson printer driver and confirm the printer appears in "Printers & scanners" with a name.
 * 3) Set environment variables:
 *    PRINTER_API_KEY (strong secret) and PRINTER_NAME (Windows printer name, e.g. "EPSON TM-T20")
 *    Optionally PORT (default 3000)
 *
 * USAGE:
 * npm install
 * set PRINTER_API_KEY=your_key
 * set PRINTER_NAME="EPSON TM-T20"
 * node index.js
 *
 * Access admin: http://localhost:3000/admin?key=YOUR_KEY
 */

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Low, JSONFile } = require('lowdb');
const { nanoid } = require('nanoid');
const ThermalPrinter = require('node-thermal-printer').printer;
const PrinterTypes = require('node-thermal-printer').types;

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.PRINTER_API_KEY || "REPLACE_WITH_STRONG_KEY";
const PRINTER_NAME = process.env.PRINTER_NAME || "EPSON_T20"; // set this to your Windows printer name

const app = express();
app.use(cors());
app.use(bodyParser.json());

// simple lowdb
const adapter = new JSONFile('./db.json');
const db = new Low(adapter);

async function initDB(){
  await db.read();
  db.data = db.data || { orders: [] };
  await db.write();
}
initDB();

// endpoint for site to create orders
app.post('/api/orders', async (req, res) => {
  const key = req.headers['x-api-key'];
  if(key !== API_KEY) return res.status(401).json({ error: 'unauthorized' });

  const { action, order } = req.body;
  if(action !== 'create_order' || !order) return res.status(400).json({ error: 'bad_request' });

  const id = nanoid(8);
  const entry = { id, createdAt: new Date().toISOString(), status: 'pendente', order };
  db.data.orders.unshift(entry);
  await db.write();
  return res.json({ ok: true, id });
});

// admin panel (basic) - protected by key query param
app.get('/admin', async (req, res) => {
  const key = req.query.key;
  if(key !== API_KEY) return res.status(401).send('401 - unauthorized');
  await db.read();
  const html = `
    <h2>Painel de Pedidos — Carlão Lanches</h2>
    <p><a href="/admin?key=${API_KEY}">Atualizar</a></p>
    ${db.data.orders.map(o => `
      <div style="border:1px solid #ddd;padding:8px;margin:8px 0;">
        <b>ID:</b> ${o.id} — ${o.createdAt} — <i>${o.status}</i><br/>
        <pre>${JSON.stringify(o.order, null, 2)}</pre>
        <form method="POST" action="/admin/print" style="display:inline">
          <input type="hidden" name="id" value="${o.id}" />
          <input type="hidden" name="key" value="${API_KEY}" />
          <button type="submit">Imprimir</button>
        </form>
      </div>
    `).join('')}
  `;
  res.send(html);
});

app.post('/admin/print', bodyParser.urlencoded({ extended: true }), async (req, res) => {
  const key = req.body.key;
  if(key !== API_KEY) return res.status(401).send('401 - unauthorized');
  const id = req.body.id;
  await db.read();
  const entry = db.data.orders.find(o => o.id === id);
  if(!entry) return res.status(404).send('Pedido não encontrado');

  try{
    await printOrder(entry);
    entry.status = 'impresso';
    entry.printedAt = new Date().toISOString();
    await db.write();
    res.send('Impressão enviada com sucesso. <a href="/admin?key=' + API_KEY + '">Voltar</a>');
  }catch(err){
    console.error('Erro impressao:', err);
    res.status(500).send('Erro ao imprimir: ' + err.message);
  }
});

async function printOrder(entry){
  // Configure the printer
  let printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: `printer:${PRINTER_NAME}`,
    characterSet: 'SLOVENIA',
    removeSpecialCharacters: false,
    lineCharacter: "="
  });

  const order = entry.order;

  let isConnected = await printer.isPrinterConnected();
  console.log('printer connected:', isConnected);

  printer.alignCenter();
  printer.println("*** PEDIDO ***");
  printer.newLine();
  printer.alignLeft();
  printer.println("ID: " + entry.id);
  printer.println("Data: " + entry.createdAt);
  printer.println("-------------------------------");
  order.items.forEach(i => {
    printer.println(`${i.qty}x ${i.name}  R$ ${i.price.toFixed(2)}`);
    if(i.exclusions && i.exclusions.length){
      printer.println(`  Excluir: ${i.exclusions.join(', ')}`);
    }
    if(i.note) printer.println(`  Obs: ${i.note}`);
  });
  printer.println("-------------------------------");
  printer.println(`Sub-total: R$ ${order.subtotal.toFixed(2)}`);
  if(order.deliveryFee) printer.println(`Taxa entrega: R$ ${order.deliveryFee.toFixed(2)}`);
  printer.println(`Total: R$ ${order.total.toFixed(2)}`);
  printer.println("");
  printer.println(`Cliente: ${order.customerName} - ${order.customerPhone}`);
  if(order.orderNote) printer.println('Obs: ' + order.orderNote);
  printer.cut();

  try{
    await printer.execute();
  }catch(err){
    throw err;
  }
}

app.listen(PORT, () => {
  console.log("Printer-server running on port", PORT);
});
