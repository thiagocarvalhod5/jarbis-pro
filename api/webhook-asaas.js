export default function handler(req, res) {
  if (req.method === 'POST') {
    console.log("Recebi algo do Asaas:", req.body);
    return res.status(200).json({ message: "Recebido com sucesso!" });
  }
  return res.status(405).json({ error: "Method Not Allowed" });
}
