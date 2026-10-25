import { useEffect, useMemo, useRef, useState } from 'react';

const movimentoVazio = { tipo: 'transferencia', produto_id: '', origem_id: '', destino_id: '', quantidade: '', motivo: '' };
const tipos = { inicial: 'Estoque inicial', entrada: 'Entrada', saida: 'Saída', transferencia: 'Transferência' };
const data = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export default function PaginaUnidades({ solicitar, Icone, moeda, numero }) {
  const [unidades, setUnidades] = useState([]);
  const [unidadeId, setUnidadeId] = useState('1');
  const [produtos, setProdutos] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [pesquisa, setPesquisa] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [carregandoEstoque, setCarregandoEstoque] = useState(true);
  const [erro, setErro] = useState('');
  const [erroEstoque, setErroEstoque] = useState('');
  const [aviso, setAviso] = useState('');
  const [versao, setVersao] = useState(0);
  const [modal, setModal] = useState(false);
  const [formulario, setFormulario] = useState(movimentoVazio);
  const [saldosOrigem, setSaldosOrigem] = useState([]);
  const [carregandoOrigem, setCarregandoOrigem] = useState(false);
  const [erroFormulario, setErroFormulario] = useState('');
  const [salvando, setSalvando] = useState(false);
  const estoqueRef = useRef(null);

  useEffect(() => {
    const controlador = new AbortController();
    setCarregando(true);
    setErro('');
    Promise.all([solicitar('/unidades', { signal: controlador.signal }), solicitar('/estoque/movimentacoes', { signal: controlador.signal })])
      .then(([lista, movimentos]) => { setUnidades(lista); setHistorico(movimentos); })
      .catch(falha => { if (falha.name !== 'AbortError') setErro(falha.message); })
      .finally(() => { if (!controlador.signal.aborted) setCarregando(false); });
    return () => controlador.abort();
  }, [versao, solicitar]);

  useEffect(() => {
    const controlador = new AbortController();
    setCarregandoEstoque(true);
    setErroEstoque('');
    setProdutos([]);
    solicitar(`/unidades/${unidadeId}/estoque`, { signal: controlador.signal })
      .then(dados => setProdutos(dados.produtos))
      .catch(falha => { if (falha.name !== 'AbortError') setErroEstoque(falha.message); })
      .finally(() => { if (!controlador.signal.aborted) setCarregandoEstoque(false); });
    return () => controlador.abort();
  }, [unidadeId, versao, solicitar]);

  useEffect(() => {
    if (!modal || formulario.tipo === 'entrada' || !formulario.origem_id) {
      setSaldosOrigem([]);
      return;
    }
    const controlador = new AbortController();
    setSaldosOrigem([]);
    setCarregandoOrigem(true);
    solicitar(`/unidades/${formulario.origem_id}/estoque`, { signal: controlador.signal })
      .then(dados => setSaldosOrigem(dados.produtos))
      .catch(falha => { if (falha.name !== 'AbortError') setErroFormulario(`Falha ao consultar saldo: ${falha.message}`); })
      .finally(() => { if (!controlador.signal.aborted) setCarregandoOrigem(false); });
    return () => controlador.abort();
  }, [modal, formulario.origem_id, formulario.tipo, solicitar]);

  useEffect(() => {
    if (!modal) return;
    const fechar = evento => { if (evento.key === 'Escape' && !salvando) setModal(false); };
    window.addEventListener('keydown', fechar);
    return () => window.removeEventListener('keydown', fechar);
  }, [modal, salvando]);

  const unidade = unidades.find(item => String(item.id) === unidadeId);
  const filtrados = useMemo(() => {
    const termo = pesquisa.toLocaleLowerCase('pt-BR').trim();
    return produtos.filter(produto => `${produto.nome} ${produto.codigo_barras}`.toLocaleLowerCase('pt-BR').includes(termo));
  }, [produtos, pesquisa]);
  const total = unidades.reduce((soma, item) => soma + item.quantidade, 0);
  const valor = unidades.reduce((soma, item) => soma + item.valor, 0);
  const disponivel = saldosOrigem.find(produto => String(produto.id) === formulario.produto_id)?.quantidade ?? 0;

  function abrir(produtoId = '') {
    setFormulario({ ...movimentoVazio, produto_id: String(produtoId), origem_id: unidadeId });
    setErroFormulario('');
    setModal(true);
  }
  function selecionarUnidade(id) {
    setUnidadeId(String(id));
    setPesquisa('');
    estoqueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function alterar(evento) {
    const { name, value } = evento.target;
    setErroFormulario('');
    setFormulario(atual => name === 'tipo' ? { ...atual, tipo: value, origem_id: value === 'entrada' ? '' : unidadeId,
      destino_id: value === 'entrada' ? unidadeId : '' } : { ...atual, [name]: value,
        ...(name === 'origem_id' && value === atual.destino_id ? { destino_id: '' } : {}) });
  }
  async function movimentar(evento) {
    evento.preventDefault();
    const quantidade = Number(formulario.quantidade);
    if (!/^\d+$/.test(formulario.quantidade) || !Number.isSafeInteger(quantidade) || quantidade <= 0) {
      setErroFormulario('Informe uma quantidade inteira maior que zero.'); return;
    }
    if (formulario.tipo !== 'entrada' && quantidade > disponivel) {
      setErroFormulario('A quantidade supera o saldo disponível na origem.'); return;
    }
    setSalvando(true);
    setErroFormulario('');
    try {
      await solicitar('/estoque/movimentacoes', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formulario, produto_id: Number(formulario.produto_id), quantidade,
          origem_id: formulario.tipo === 'entrada' ? null : Number(formulario.origem_id),
          destino_id: formulario.tipo === 'saida' ? null : Number(formulario.destino_id) }) });
      setModal(false);
      setAviso(`${tipos[formulario.tipo]} registrada com sucesso.`);
      setVersao(atual => atual + 1);
    } catch (falha) { setErroFormulario(falha.message); }
    finally { setSalvando(false); }
  }

  return (
    <main className="conteudo">
      <header className="topo"><div className="caminho">Painel <span>/</span> Unidades</div><span className="topo-selo">ConectaByte Informática</span></header>
      <div className="pagina">
        <div className="titulo-linha">
          <div><p className="sobretitulo">ESTOQUE NA REDE</p><h1>Estoque por unidade</h1><p className="subtitulo">Consulte saldos, registre entradas e saídas e transfira produtos entre lojas.</p></div>
          <button className="botao discreto" type="button" disabled={carregando || salvando} onClick={() => setVersao(atual => atual + 1)}><Icone nome="atualizar" tamanho={17} /> Atualizar</button>
        </div>
        <p className="unidades-aviso">Projeto acadêmico: os endereços são dos shoppings reais. A presença da ConectaByte e os números das lojas são fictícios.</p>
        {erro && <div className="aviso erro" role="alert">{erro}</div>}
        {aviso && <div className="aviso sucesso" role="status">{aviso}</div>}
        <section className="resumo" aria-label="Resumo da rede">
          <div className="resumo-cartao"><span>Unidades da rede</span><strong>{numero.format(unidades.length)}</strong></div>
          <div className="resumo-cartao"><span>Peças em toda a rede</span><strong>{numero.format(total)}</strong></div>
          <div className="resumo-cartao"><span>Valor de venda do estoque</span><strong>{moeda.format(valor)}</strong></div>
        </section>
        <div className="unidades-grade">
          {unidades.map(item => (
            <article className={`unidade-cartao ${unidadeId === String(item.id) ? 'selecionada' : ''}`} key={item.id}>
              <div className="unidade-cabecalho"><span className={`unidade-tipo ${item.tipo === 'Sede' ? 'sede' : ''}`}>{item.tipo}</span><strong>{item.cidade} · {item.uf}</strong></div>
              <h2>{item.shopping}</h2><p>{item.endereco}<br />Loja {item.loja} (fictícia)</p>
              <div className="unidade-saldo"><strong>{numero.format(item.quantidade)} <small>peças</small></strong><span>{item.produtos_disponiveis} produtos disponíveis</span></div>
              <div className="unidade-rodape"><button className="botao discreto" type="button" aria-pressed={unidadeId === String(item.id)} onClick={() => selecionarUnidade(item.id)}>Ver estoque</button><a href={item.fonte} target="_blank" rel="noopener noreferrer">Endereço ↗</a></div>
            </article>
          ))}
        </div>

        <section className="painel estoque-painel" aria-labelledby="estoque-titulo" ref={estoqueRef}>
          <div className="painel-topo"><div><h2 id="estoque-titulo">{unidade ? `Estoque de ${unidade.cidade}` : 'Estoque da unidade'}</h2><p>Produtos sem saldo também aparecem para facilitar a reposição.</p></div><button className="botao primario" type="button" onClick={() => abrir()} disabled={carregando || carregandoEstoque || !!erroEstoque}><Icone nome="mais" tamanho={17} /> Movimentar estoque</button></div>
          <div className="estoque-filtros"><label className="campo"><span>Unidade</span><select value={unidadeId} onChange={evento => { setUnidadeId(evento.target.value); setPesquisa(''); }}>{unidades.map(item => <option key={item.id} value={item.id}>{item.cidade} · {item.uf}</option>)}</select></label><label className="campo"><span>Buscar produto</span><input value={pesquisa} onChange={evento => setPesquisa(evento.target.value)} placeholder="Nome ou código" /></label></div>
          {erroEstoque && <div className="aviso erro associacao-aviso" role="alert">{erroEstoque}</div>}
          {carregandoEstoque ? <div className="estado-lista">Carregando saldos...</div> : <div className="tabela-container"><table><thead><tr><th>Produto</th><th>Código</th><th>Preço de venda</th><th>Saldo da loja</th><th>Ação</th></tr></thead><tbody>{filtrados.map(produto => <tr key={produto.id}><td><strong>{produto.nome}</strong></td><td>{produto.codigo_barras}</td><td>{moeda.format(produto.preco)}</td><td><span className={`estoque-pill ${produto.quantidade === 0 ? 'zerado' : ''}`}>{numero.format(produto.quantidade)} un.</span></td><td><button className="botao discreto" type="button" onClick={() => abrir(produto.id)}>Movimentar</button></td></tr>)}</tbody></table>{filtrados.length === 0 && !erroEstoque && <div className="estado-lista">Nenhum produto encontrado.</div>}</div>}
        </section>

        <section className="painel estoque-painel" aria-labelledby="historico-titulo"><div className="painel-topo"><div><h2 id="historico-titulo">Histórico de movimentações</h2><p>Últimos 100 registros da rede, incluindo a distribuição inicial.</p></div></div><div className="tabela-container historico-tabela"><table><thead><tr><th>Data</th><th>Produto</th><th>Movimento</th><th>Origem → destino</th><th>Quantidade</th><th>Motivo</th></tr></thead><tbody>{historico.map(item => <tr key={item.id}><td>{data.format(new Date(item.criado_em))}</td><td>{item.produto_nome}</td><td>{tipos[item.tipo]}</td><td>{item.origem || '—'} → {item.destino || '—'}</td><td>{numero.format(item.quantidade)}</td><td>{item.motivo}</td></tr>)}</tbody></table>{!historico.length && <div className="estado-lista">Nenhuma movimentação registrada.</div>}</div></section>
      </div>

      {modal && <div className="modal-fundo" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="movimento-titulo"><div className="modal-topo"><div><p className="sobretitulo">CONTROLE POR LOJA</p><h2 id="movimento-titulo">Movimentar estoque</h2></div><button className="botao-icone" type="button" onClick={() => setModal(false)} aria-label="Fechar" disabled={salvando}><Icone nome="fechar" /></button></div>
        <form onSubmit={movimentar}><div className="modal-corpo">
          <label className="campo"><span>Tipo de movimentação</span><select name="tipo" value={formulario.tipo} onChange={alterar} disabled={salvando} autoFocus><option value="transferencia">Transferência entre lojas</option><option value="entrada">Entrada / recebimento</option><option value="saida">Saída / venda ou ajuste</option></select></label>
          <label className="campo"><span>Produto *</span><select name="produto_id" value={formulario.produto_id} onChange={alterar} required disabled={salvando}><option value="">Selecione um produto</option>{produtos.map(produto => <option key={produto.id} value={produto.id}>{produto.nome}</option>)}</select></label>
          {formulario.tipo !== 'entrada' && <label className="campo"><span>Unidade de origem *</span><select name="origem_id" value={formulario.origem_id} onChange={alterar} required disabled={salvando}><option value="">Selecione</option>{unidades.map(item => <option key={item.id} value={item.id}>{item.cidade}</option>)}</select></label>}
          {formulario.tipo !== 'saida' && <label className="campo"><span>Unidade de destino *</span><select name="destino_id" value={formulario.destino_id} onChange={alterar} required disabled={salvando}><option value="">Selecione</option>{unidades.filter(item => formulario.tipo === 'entrada' || String(item.id) !== formulario.origem_id).map(item => <option key={item.id} value={item.id}>{item.cidade}</option>)}</select></label>}
          {formulario.tipo !== 'entrada' && <p role="status">{carregandoOrigem ? 'Consultando saldo...' : `Saldo disponível na origem: ${numero.format(disponivel)} un.`}</p>}
          <label className="campo"><span>Quantidade *</span><input name="quantidade" value={formulario.quantidade} onChange={alterar} inputMode="numeric" required disabled={salvando} placeholder="Ex.: 2" /></label>
          <label className="campo"><span>Motivo *</span><input name="motivo" value={formulario.motivo} onChange={alterar} minLength={3} maxLength={200} required disabled={salvando} placeholder="Ex.: Reposição da filial" /></label>
          {formulario.tipo === 'transferencia' && <p>A quantidade será retirada da origem e acrescentada ao destino. O total da empresa será preservado.</p>}
          {erroFormulario && <div className="aviso erro" role="alert">{erroFormulario}</div>}
        </div><div className="modal-acoes"><button className="botao discreto" type="button" onClick={() => setModal(false)} disabled={salvando}>Cancelar</button><button className="botao primario" type="submit" disabled={salvando || (formulario.tipo !== 'entrada' && carregandoOrigem)}>{salvando ? 'Registrando...' : `Confirmar ${tipos[formulario.tipo].toLocaleLowerCase('pt-BR')}`}</button></div></form>
      </section></div>}
    </main>
  );
}
