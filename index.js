const path = require("path");
const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const qrcode = require("qrcode-terminal");

async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState(path.resolve(__dirname, "auth"));
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    auth: state,
    browser: ["Ubuntu", "Chrome", "1.0.0"],
    markOnlineOnConnect: true,
  });

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("Escaneie esse QR Code no WhatsApp Web:");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const shouldReconnect =
        new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log("Conexão fechada. Reconectando...");
      if (shouldReconnect) connect();
    } else if (connection === "open") {
      console.log("✅ Conectado com sucesso!");
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

connect()
  .then(() => console.log("Bot pronto para uso!"))
  .catch((err) => console.error("Erro na conexão:", err));