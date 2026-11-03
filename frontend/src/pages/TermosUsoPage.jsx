import { useEffect } from "react";
import { Link } from "react-router-dom";
import PaginaLegal from "../components/PaginaLegal";
import { ORGANIZACAO as ong } from "../config/organizacao";

// Termos de Uso e Confidencialidade (modelo). Os dados da ONG vêm de config/organizacao.js.
// Este texto deve ser revisado por assessoria jurídica antes do uso com dados reais.
export default function TermosUsoPage() {
  useEffect(() => {
    document.title = `Termos de Uso · ${ong.nome}`;
  }, []);

  return (
    <PaginaLegal titulo="Termos de Uso e Confidencialidade" atualizadoEm={ong.ultimaAtualizacao}>
      <p>
        Estas regras valem para quem usa o sistema de controle de estoque de doações da{" "}
        <strong>{ong.nome}</strong>. Ao entrar, você declara que leu e concorda com elas.
      </p>

      <h2>1. Para que serve o sistema</h2>
      <p>
        Registrar as doações recebidas, acompanhar a validade dos produtos e controlar o que
        sai do estoque. O acesso é <strong>restrito a pessoas autorizadas pela ONG</strong> e
        deve ser usado apenas para as atividades da ONG.
      </p>

      <h2>2. Sua conta e sua senha</h2>
      <ul>
        <li>A conta é pessoal e intransferível. Não compartilhe seu login nem sua senha.</li>
        <li>Troque a senha temporária no primeiro acesso e use uma senha que ninguém adivinhe.</li>
        <li>Se suspeitar que alguém usou sua conta, avise a ONG imediatamente.</li>
        <li>Saia do sistema (botão &quot;Sair&quot;) ao usar um computador compartilhado.</li>
      </ul>

      <h2>3. Uso correto</h2>
      <ul>
        <li>Registre apenas informações verdadeiras e confira quantidades e validades.</li>
        <li>Não tente burlar a segurança, acessar contas de outras pessoas ou apagar registros indevidamente.</li>
        <li>Não use o sistema para outras finalidades que não as da ONG.</li>
      </ul>

      <h2>4. Dados pessoais e confidencialidade</h2>
      <ul>
        <li>Use os dados de doadores e de outros usuários <strong>só</strong> para as atividades da ONG.</li>
        <li>
          <strong>Não registre</strong> nome, endereço, telefone, documentos ou outros dados de
          pessoas atendidas, principalmente de crianças e adolescentes, nem dados sensíveis
          (como saúde ou religião), nos campos de texto livre (destino e observação).
        </li>
        <li>
          Não copie, exporte, fotografe a tela nem envie informações do sistema para fora dele
          (inclusive em grupos de mensagens ou redes sociais).
        </li>
        <li>
          O dever de confidencialidade continua depois que você deixar de ser voluntário ou
          colaborador da ONG.
        </li>
      </ul>
      <p>
        Veja como os dados são tratados na <Link to="/privacidade">Política de Privacidade</Link>.
      </p>

      <h2>5. Os alertas de validade são um apoio</h2>
      <p>
        Os avisos de vencimento ajudam a organizar o estoque, mas{" "}
        <strong>não substituem a conferência física</strong> dos produtos nem as regras
        sanitárias aplicáveis. Antes de entregar qualquer item, confira a validade e o estado
        da embalagem. Também pode haver diferenças entre o que o sistema mostra e o que está
        no estoque.
      </p>

      <h2>6. Registro de atividades</h2>
      <p>
        As ações feitas no sistema (como registrar uma doação ou uma saída) ficam gravadas com
        o seu nome e a data e hora, para fins de organização, auditoria e prestação de contas.
      </p>

      <h2>7. Disponibilidade</h2>
      <p>
        O sistema pode ficar indisponível por manutenção ou falhas. Recomenda-se manter um
        registro alternativo (como uma anotação) para os momentos em que ele não estiver
        funcionando.
      </p>

      <h2>8. Suspensão do acesso</h2>
      <p>
        A ONG pode suspender ou encerrar o acesso de quem descumprir estas regras ou deixar de
        atuar na organização, sem prejuízo das medidas previstas no termo de adesão do
        voluntariado ou no contrato e na lei.
      </p>

      <h2>9. Nome, logotipo e arte</h2>
      <p>
        O nome, o logotipo e a identidade visual da {ong.nome} pertencem à ONG e não podem ser
        usados fora das atividades dela sem autorização.
      </p>

      <h2>10. Lei aplicável e dúvidas</h2>
      <p>
        Estes termos seguem a lei brasileira. Foro: {ong.foro}. Dúvidas ou pedidos sobre dados
        pessoais: <strong>{ong.emailPrivacidade}</strong>.
      </p>
    </PaginaLegal>
  );
}