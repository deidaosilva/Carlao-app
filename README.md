
# Carlão Lanches — Pedido Online (Windows + Epson TM-T20 USB)

Conteúdo: site front-end (`index.html`) e `printer-server/` (Node.js) para rodar em Windows conectado à impressora Epson TM-T20 por USB.

## O que está incluso
- `index.html` — site responsivo com:
  - Cardápio (itens e preços extraídos das imagens)
  - Mensagem: "Todos os lanches acompanham: molho, milho, ervilha, maionese, catchup, mostarda, alface, queijo, ovo"
  - Opções por item para **excluir acompanhamentos**
  - Escolha Retirar / Tele (+ R$10)
  - Horário de funcionamento: Segunda a Segunda 18:30 — 23:45 (fora desse horário o envio é desabilitado)
  - Tempo de espera exibido conforme dia e tipo (Mon-Thu / Fri-Sun)
  - Envio de mensagem para WhatsApp para: +55 51 3722-5848
  - Ao confirmar, o site grava o pedido no servidor (`/api/orders`) com `status: pendente` (para impressão posterior pela empresa)

- `printer-server/` — servidor Node.js (Windows) com:
  - API `POST /api/orders` (requer header `x-api-key`)
  - Painel simples `GET /admin?key=API_KEY` para listar pedidos e botão `Imprimir`
  - Impressão usando `node-thermal-printer` para impressoras EPSON via Windows Print Spooler.
  - Arquivo `db.json` que armazena pedidos

## Instalação (Servidor — Windows)
1. Instale Node.js (v16+ recomendado).
2. Instale a impressora Epson e confirme o nome exibido em `Configurações > Impressoras & scanners`.
3. Copie a pasta `printer-server` para a máquina Windows ligada à impressora.
4. Abra PowerShell na pasta `printer-server` e execute:
   ```
   npm install
   ```
5. Configure variáveis de ambiente (poder usar `set` no PowerShell):
   ```
   set PRINTER_API_KEY=uma_chave_forte_aqui
   set PRINTER_NAME="Nome exato da impressora no Windows"
   set PORT=3000
   ```
6. Inicie o servidor:
   ```
   node index.js
   ```
7. Abra o painel em: `http://localhost:3000/admin?key=SUA_CHAVE`

## Uso
- O cliente faz o pedido no `index.html` (pode hospedar em qualquer servidor / GitHub Pages). Ao confirmar, o WhatsApp abre no celular do cliente e o servidor recebe uma cópia do pedido.
- A equipe abre o painel `/admin?key=...`, verifica o pedido e clica **Imprimir** para enviar o bilhete para a Epson TM-T20.
- A impressão só é acionada pela equipe (cliente não escolhe imprimir).

## Segurança
- Use uma chave forte em `PRINTER_API_KEY`.
- Rode o servidor em rede segura ou local (`localhost`) para evitar exposição pública.
- Se for expor o servidor, proteja `/admin` com autenticação adicional.

## Observações
- O `node-thermal-printer` usa o Windows print spooler; a `PRINTER_NAME` deve ser exatamente o nome da impressora instalada.
- Se tiver problemas de driver, instale drivers oficiais Epson.

