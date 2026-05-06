import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase usando as Variáveis de Ambiente que você vai cadastrar na Vercel
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export default async function handler(req, res) {
  // O Asaas envia os dados via método POST
  if (req.method === 'POST') {
    const { event, payment } = req.body;

    // 1. Verifica se o evento é de "Pagamento Recebido"
    if (event === 'PAYMENT_RECEIVED') {
      const customerId = payment.customer; // ID do cliente no Asaas
      const amount = payment.value;        // Valor pago (ex: 29.90)

      try {
        // 2. Busca o usuário no seu banco de dados do Supabase pelo ID do cliente Asaas
        // Importante: Sua tabela 'usuarios' deve ter uma coluna 'asaas_id'
        const { data: user, error: userError } = await supabase
          .from('usuarios')
          .select('id, creditos')
          .eq('asaas_id', customerId)
          .single();

        if (userError || !user) {
          console.error('Usuário não encontrado para o ID Asaas:', customerId);
          return res.status(404).json({ error: 'Usuario nao encontrado' });
        }

        // 3. Define quantos créditos adicionar (Ex: 5000 créditos para o plano de R$ 29,90)
        const creditosParaAdicionar = 5000;
        const novoSaldo = (user.creditos || 0) + creditosParaAdicionar;

        // 4. Atualiza o saldo no Supabase
        const { error: updateError } = await supabase
          .from('usuarios')
          .update({ creditos: novoSaldo })
          .eq('id', user.id);

        if (updateError) throw updateError;

        console.log(`Sucesso! Adicionado ${creditosParaAdicionar} créditos para o usuário ${user.id}`);
        return res.status(200).json({ message: 'Creditos adicionados com sucesso' });

      } catch (error) {
        console.error('Erro ao processar webhook:', error.message);
        return res.status(500).json({ error: 'Erro interno no servidor' });
      }
    }

    // Se receber outro evento que não seja pagamento, apenas ignora
    return res.status(200).json({ message: 'Evento recebido' });
  } else {
    // Bloqueia acessos que não sejam POST (como abrir o link no navegador)
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
