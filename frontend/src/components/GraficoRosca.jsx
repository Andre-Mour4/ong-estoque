// Gráfico de rosca (donut) feito em SVG puro, sem biblioteca.
//
// Uso:
//   <GraficoRosca
//     rotuloCentro="lotes"
//     dados={[
//       { rotulo: "Vencidos", valor: 2, cor: "var(--color-status-vencido)" },
//       { rotulo: "Em dia", valor: 18, cor: "var(--color-status-ok)" },
//     ]}
//   />

const RAIO = 54;
const LARGURA = 18;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;

export default function GraficoRosca({ dados, rotuloCentro }) {
  const total = dados.reduce((soma, item) => soma + item.valor, 0);

  if (total === 0) {
    return <p className="rosca__vazio">Ainda não há dados para mostrar.</p>;
  }

  const visiveis = dados.filter((item) => item.valor > 0);
  // Pequena folga entre as fatias, só quando há mais de uma.
  const folga = visiveis.length > 1 ? 2 : 0;

  const fatias = visiveis.map((item, indice) => {
    const somaAnterior = visiveis
      .slice(0, indice)
      .reduce((soma, outro) => soma + outro.valor, 0);
    const comprimento = (item.valor / total) * CIRCUNFERENCIA;
    return {
      ...item,
      comprimento: Math.max(comprimento - folga, 0.1),
      inicio: (somaAnterior / total) * CIRCUNFERENCIA,
    };
  });

  const descricao = dados.map((item) => `${item.rotulo}: ${item.valor}`).join(", ");

  return (
    <div className="rosca">
      <svg
        className="rosca__svg"
        viewBox="0 0 140 140"
        role="img"
        aria-label={`${rotuloCentro}. ${descricao}`}
      >
        <circle
          cx="70"
          cy="70"
          r={RAIO}
          fill="none"
          stroke="#efe9dc"
          strokeWidth={LARGURA}
        />
        <g transform="rotate(-90 70 70)">
          {fatias.map((fatia) => (
            <circle
              key={fatia.rotulo}
              cx="70"
              cy="70"
              r={RAIO}
              fill="none"
              strokeWidth={LARGURA}
              strokeDasharray={`${fatia.comprimento} ${
                CIRCUNFERENCIA - fatia.comprimento
              }`}
              strokeDashoffset={-fatia.inicio}
              style={{ stroke: fatia.cor }}
            />
          ))}
        </g>
        <text x="70" y="69" textAnchor="middle" className="rosca__total">
          {total}
        </text>
        <text x="70" y="86" textAnchor="middle" className="rosca__rotulo">
          {rotuloCentro}
        </text>
      </svg>

      <ul className="rosca__legenda">
        {dados.map((item) => (
          <li key={item.rotulo}>
            <span
              className="rosca__cor"
              style={{ background: item.cor }}
              aria-hidden="true"
            />
            <span>{item.rotulo}</span>
            <strong>{item.valor}</strong>
            <span className="rosca__pct">
              {Math.round((item.valor / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}