import { useEffect } from "react";
import PaginaLegal from "../components/PaginaLegal";
import { ORGANIZACAO as ong } from "../config/organizacao";

// Política de Privacidade (modelo). Os dados da ONG vêm de config/organizacao.js.
// Este texto deve ser revisado por assessoria jurídica antes do uso com dados reais.
export default function PoliticaPrivacidadePage() {
  useEffect(() => {
    document.title = `Política de Privacidade · ${ong.nome}`;
  }, []);

  return (
    <PaginaLegal titulo="Política de Privacidade" atualizadoEm={ong.ultimaAtualizacao}>
      <p>
        Este é o sistema de controle de estoque de doações da <strong>{ong.nome}</strong>. É um
        sistema <strong>interno</strong>: só entra quem a ONG autorizou. Aqui explicamos, em
        linguagem simples, quais dados pessoais ele guarda, para quê e quais são os seus
        direitos, conforme a Lei Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018).
      </p>

      <h2>1. Quem é responsável pelos dados</h2>
      <p>
        A controladora dos dados é a <strong>{ong.razaoSocial}</strong> (CNPJ {ong.cnpj}),
        {" "}de {ong.cidadeUf}. Quem responde pelos dados na ONG: {ong.responsavelDados}.
      </p>

      <h2>2. Quais dados guardamos</h2>
      <ul>
        <li>
          <strong>De quem usa o sistema</strong> (voluntários e colaboradores): nome, e-mail,
          perfil de acesso e a senha, que fica guardada de forma criptografada (ninguém
          consegue ler).
        </li>
        <li>
          <strong>Do que cada pessoa faz no sistema:</strong> quem registrou cada entrada e
          saída de estoque, e quando.
        </li>
        <li>
          <strong>De doadores:</strong> nome, tipo (pessoa física, empresa ou campanha) e, se
          informado, um contato (telefone ou e-mail).
        </li>
        <li>
          <strong>Dados técnicos:</strong> o serviço de hospedagem registra o endereço IP e
          dados de acesso para o sistema funcionar e ficar seguro.
        </li>
      </ul>
      <p>
        Não pedimos CPF, RG, endereço, fotos nem dados sensíveis. Pedimos que ninguém registre
        dados de pessoas atendidas pela ONG, em especial de crianças e adolescentes.
      </p>

      <h2>3. Para que usamos e por qual motivo legal</h2>
      <ul>
        <li>
          <strong>Controlar o estoque de doações e prestar contas</strong> da ONG: legítimo
          interesse da ONG e exercício regular de direitos.
        </li>
        <li>
          <strong>Identificar quem acessa e manter o sistema seguro:</strong> legítimo interesse
          da ONG e prevenção a fraudes e acessos indevidos.
        </li>
        <li>
          <strong>Entrar em contato com doadores</strong> (por exemplo, para agradecer), quando
          o doador informou o contato: com o consentimento da pessoa.
        </li>
      </ul>
      <p>Não usamos os dados para propaganda e não vendemos dados.</p>

      <h2>4. Com quem compartilhamos</h2>
      <p>
        Apenas com os serviços que mantêm o sistema no ar (hospedagem): {ong.hospedagem}. Eles
        tratam os dados em nome da ONG. Alguns servidores podem ficar fora do Brasil; nesse
        caso, a transferência segue as regras da LGPD. Também podemos compartilhar dados com
        autoridades quando a lei exigir.
      </p>

      <h2>5. Por quanto tempo guardamos</h2>
      <p>
        Pelo tempo necessário para as finalidades acima. Prazo definido pela ONG:{" "}
        {ong.prazoRetencao}. Depois disso, os dados são eliminados ou anonimizados, salvo
        quando a lei exigir a guarda.
      </p>

      <h2>6. Cookies e rastreamento</h2>
      <p>
        O sistema <strong>não usa cookies</strong>, nem ferramentas de análise, publicidade ou
        rastreamento. Guardamos no seu navegador apenas um código de login (necessário para
        você continuar logado). Ele é apagado quando você clica em &quot;Sair&quot;.
      </p>

      <h2>7. Segurança</h2>
      <p>
        Usamos senhas criptografadas, acesso por perfis (administrador e voluntário), conexão
        segura e cópias de segurança. Nenhum sistema é 100% seguro, mas trabalhamos para
        reduzir os riscos. Se houver um incidente que possa causar risco ou dano relevante, a
        ONG comunicará a Autoridade Nacional de Proteção de Dados (ANPD) e as pessoas
        afetadas, nos prazos da lei.
      </p>

      <h2>8. Seus direitos</h2>
      <p>Você pode pedir à ONG, a qualquer momento:</p>
      <ul>
        <li>confirmação de que tratamos seus dados e acesso a eles;</li>
        <li>correção de dados incompletos, errados ou desatualizados;</li>
        <li>anonimização ou eliminação de dados desnecessários ou tratados sem base legal;</li>
        <li>portabilidade, quando aplicável;</li>
        <li>informação sobre com quem os dados foram compartilhados;</li>
        <li>revogação do consentimento, quando o tratamento depender dele.</li>
      </ul>
      <p>
        Para exercer seus direitos, escreva para <strong>{ong.emailPrivacidade}</strong>.
        Pedidos de acesso são respondidos em até 15 dias. Você também pode reclamar à ANPD.
      </p>

      <h2>9. Crianças e adolescentes</h2>
      <p>
        Este sistema não foi feito para guardar dados de crianças e adolescentes. Se você
        encontrar um dado desse tipo registrado, avise a ONG para que ele seja removido.
      </p>

      <h2>10. Mudanças nesta política</h2>
      <p>
        Podemos atualizar este texto. A data da última atualização aparece no topo da página.
      </p>
    </PaginaLegal>
  );
}