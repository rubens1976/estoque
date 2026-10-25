import { useEffect, useMemo, useState } from 'react';

export default function PaginaAssociacoes({ solicitar, Icone, numero }) {
  const [produtos, setProdutos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [carregandoCadastros, setCarregandoCadastros] = useState(true);
  const [erroCadastros, setErroCadastros] = useState('');
  const [produtoId, setProdutoId] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [fornecedorConsultaId, setFornecedorConsultaId] = useState('');
  const [fornecedoresDoProduto, setFornecedoresDoProduto] = useState([]);
  const [produtosDoFornecedor, setProdutosDoFornecedor] = useState([]);
  const [carregandoVinculos, setCarregandoVinculos] = useState(false);
  const [carregandoConsulta, setCarregandoConsulta] = useState(false);
  const [erroVinculos, setErroVinculos] = useState('');
  const [erroConsulta, setErroConsulta] = useState('');
  const [aviso, setAviso] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [fornecedorRemovido, setFornecedorRemovido] = useState(null);
  const [removendo, setRemovendo] = useState(false);
  const [erroRemocao, setErroRemocao] = useState('');

  async function carregarCadastros(signal) {
    setCarregandoCadastros(true);
    setErroCadastros('');
    try {
      const [listaProdutos, listaFornecedores] = await Promise.all([
        solicitar('/produtos', { signal }),
        solicitar('/fornecedores', { signal })
      ]);
      if (signal?.aborted) return;
      setProdutos(listaProdutos);
      setFornecedores(listaFornecedores);
      setProdutoId(atual => listaProdutos.some(produto => String(produto.id) === atual)
        ? atual : String(listaProdutos[0]?.id ?? ''));
      setFornecedorId(atual => listaFornecedores.some(fornecedor => String(fornecedor.id) === atual)
        ? atual : '');
      setFornecedorConsultaId(atual => listaFornecedores.some(fornecedor => String(fornecedor.id) === atual)
        ? atual : '');
      const consultas = [];
      if (listaProdutos.some(produto => String(produto.id) === produtoId)) {
        consultas.push(carregarFornecedoresDoProduto(produtoId, signal));
      }
      if (listaFornecedores.some(fornecedor => String(fornecedor.id) === fornecedorConsultaId)) {
        consultas.push(carregarProdutosDoFornecedor(fornecedorConsultaId, signal));
      }
      await Promise.all(consultas);
    } catch (erro) {
      if (erro.name !== 'AbortError') setErroCadastros(`Não foi possível carregar os cadastros. ${erro.message}`);
    } finally {
      if (!signal?.aborted) setCarregandoCadastros(false);
    }
  }

  async function carregarFornecedoresDoProduto(id, signal) {
    if (!id) {
      setFornecedoresDoProduto([]);
      setErroVinculos('');
      return;
    }
    setCarregandoVinculos(true);
    setErroVinculos('');
    setFornecedoresDoProduto([]);
    try {
      const lista = await solicitar(`/produtos/${id}/fornecedores`, { signal });
      if (!signal?.aborted) setFornecedoresDoProduto(lista);
    } catch (erro) {
      if (erro.name !== 'AbortError') setErroVinculos(`Não foi possível consultar os vínculos. ${erro.message}`);
    } finally {
      if (!signal?.aborted) setCarregandoVinculos(false);
    }
  }

  async function carregarProdutosDoFornecedor(id, signal) {
    if (!id) {
      setProdutosDoFornecedor([]);
      setErroConsulta('');
      return;
    }
    setCarregandoConsulta(true);
    setErroConsulta('');
    setProdutosDoFornecedor([]);
    try {
      const lista = await solicitar(`/fornecedores/${id}/produtos`, { signal });
      if (!signal?.aborted) setProdutosDoFornecedor(lista);
    } catch (erro) {
      if (erro.name !== 'AbortError') setErroConsulta(`Não foi possível consultar os produtos. ${erro.message}`);
    } finally {
      if (!signal?.aborted) setCarregandoConsulta(false);
    }
  }

  useEffect(() => {
    const controlador = new AbortController();
    carregarCadastros(controlador.signal);
    return () => controlador.abort();
  }, []);

  useEffect(() => {
    const controlador = new AbortController();
    carregarFornecedoresDoProduto(produtoId, controlador.signal);
    return () => controlador.abort();
  }, [produtoId]);

  useEffect(() => {
    const controlador = new AbortController();
    carregarProdutosDoFornecedor(fornecedorConsultaId, controlador.signal);
    return () => controlador.abort();
  }, [fornecedorConsultaId]);

  const produtoSelecionado = produtos.find(produto => String(produto.id) === produtoId);
  const fornecedorSelecionado = fornecedores.find(fornecedor => String(fornecedor.id) === fornecedorConsultaId);
  const idsVinculados = useMemo(() => new Set(fornecedoresDoProduto.map(fornecedor => fornecedor.id)), [fornecedoresDoProduto]);
  const fornecedoresDisponiveis = fornecedores.filter(fornecedor => !idsVinculados.has(fornecedor.id));

  async function vincular(evento) {
    evento.preventDefault();
    if (!produtoId || !fornecedorId) {
      setAviso({ tipo: 'erro', texto: 'Selecione um produto e um fornecedor.' });
      return;
    }
    setSalvando(true);
    setAviso(null);
    try {
      await solicitar(`/produtos/${produtoId}/fornecedores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fornecedor_id: Number(fornecedorId) })
      });
      await carregarFornecedoresDoProduto(produtoId);
      if (fornecedorConsultaId === fornecedorId) await carregarProdutosDoFornecedor(fornecedorId);
      setFornecedorId('');
      setAviso({ tipo: 'sucesso', texto: 'Fornecedor vinculado ao produto.' });
    } catch (erro) {
      setAviso({ tipo: 'erro', texto: erro.message });
    } finally {
      setSalvando(false);
    }
  }

  async function removerVinculo() {
    if (!fornecedorRemovido || !produtoId) return;
    setRemovendo(true);
    setErroRemocao('');
    try {
      await solicitar(`/produtos/${produtoId}/fornecedores/${fornecedorRemovido.id}`, { method: 'DELETE' });
      await carregarFornecedoresDoProduto(produtoId);
      if (fornecedorConsultaId === String(fornecedorRemovido.id)) {
        await carregarProdutosDoFornecedor(fornecedorConsultaId);
      }
      setFornecedorRemovido(null);
      setAviso({ tipo: 'sucesso', texto: 'Vínculo removido. Os cadastros foram preservados.' });
    } catch (erro) {
      setErroRemocao(erro.message);
    } finally {
      setRemovendo(false);
    }
  }

  return (
    <main className="conteudo">
      <header className="topo">
        <div className="caminho">Painel <span>/</span> Associações</div>
        <span className="topo-selo">ConectaByte Informática</span>
      </header>
      <div className="pagina">
        <div className="titulo-linha">
          <div>
            <p className="sobretitulo">PRODUTOS E FORNECEDORES</p>
            <h1>Associações</h1>
            <p className="subtitulo">Consulte e organize os vínculos entre produtos e fornecedores. Os dados de exemplo são fictícios e não indicam relações comerciais verificadas.</p>
          </div>
          <button className="botao discreto" type="button" onClick={() => carregarCadastros()}
            disabled={carregandoCadastros || salvando || removendo}>
            <Icone nome="atualizar" tamanho={17} /> Atualizar cadastros
          </button>
        </div>

        <section className="resumo" aria-label="Resumo das associações">
          <div className="resumo-cartao"><span>Produtos cadastrados</span><strong>{numero.format(produtos.length)}</strong></div>
          <div className="resumo-cartao"><span>Fornecedores cadastrados</span><strong>{numero.format(fornecedores.length)}</strong></div>
          <div className="resumo-cartao"><span>Fornecedores deste produto</span><strong>{numero.format(fornecedoresDoProduto.length)}</strong></div>
        </section>

        {erroCadastros && <div className="aviso erro" role="alert">{erroCadastros}</div>}
        {aviso && <div className={`aviso ${aviso.tipo}`} role="status">{aviso.texto}</div>}

        <div className="associacoes-grade">
          <section className="painel" aria-labelledby="associar-titulo">
            <div className="painel-topo">
              <div>
                <h2 id="associar-titulo">Fornecedores do produto</h2>
                <p>Selecione um produto para consultar e criar vínculos.</p>
              </div>
            </div>
            <form className="associacao-formulario" onSubmit={vincular}>
              <label className="campo">
                <span>Produto</span>
                <select value={produtoId} onChange={evento => { setProdutoId(evento.target.value); setFornecedorId(''); setAviso(null); }}
                  disabled={carregandoCadastros || salvando || removendo}>
                  <option value="">Selecione um produto</option>
                  {produtos.map(produto => <option key={produto.id} value={produto.id}>{produto.nome}</option>)}
                </select>
              </label>
              <label className="campo">
                <span>Fornecedor para vincular</span>
                <select value={fornecedorId} onChange={evento => setFornecedorId(evento.target.value)}
                  disabled={!produtoId || carregandoCadastros || carregandoVinculos || salvando || removendo}>
                  <option value="">Selecione um fornecedor</option>
                  {fornecedoresDisponiveis.map(fornecedor =>
                    <option key={fornecedor.id} value={fornecedor.id}>{fornecedor.nome}</option>)}
                </select>
              </label>
              <button className="botao primario" type="submit" disabled={!produtoId || !fornecedorId || carregandoVinculos || salvando || removendo}>
                <Icone nome="mais" tamanho={17} /> {salvando ? 'Vinculando...' : 'Vincular fornecedor'}
              </button>
            </form>

            <div className="associacao-lista-titulo">
              <h3>{produtoSelecionado ? `Vinculados a ${produtoSelecionado.nome}` : 'Fornecedores vinculados'}</h3>
              <span>{fornecedoresDoProduto.length} {fornecedoresDoProduto.length === 1 ? 'vínculo' : 'vínculos'}</span>
            </div>
            {erroVinculos && <div className="aviso erro associacao-aviso" role="alert">{erroVinculos}</div>}
            {carregandoVinculos ? <div className="estado-lista">Carregando vínculos...</div> :
              !produtoId ? <div className="estado-lista">Cadastre ou selecione um produto para começar.</div> :
                fornecedoresDoProduto.length === 0 ? <div className="estado-lista">Este produto ainda não tem fornecedores vinculados.</div> :
                  <ul className="associacao-lista">
                    {fornecedoresDoProduto.map(fornecedor => (
                      <li key={fornecedor.id}>
                        <span><strong>{fornecedor.nome}</strong><small>{fornecedor.cnpj}</small></span>
                        <button className="acao excluir" type="button" onClick={() => { setFornecedorRemovido(fornecedor); setErroRemocao(''); }}
                          aria-label={`Remover vínculo com ${fornecedor.nome}`} title="Remover vínculo" disabled={salvando || removendo}>
                          <Icone nome="lixeira" tamanho={17} />
                        </button>
                      </li>
                    ))}
                  </ul>}
          </section>

          <section className="painel" aria-labelledby="consulta-titulo">
            <div className="painel-topo">
              <div>
                <h2 id="consulta-titulo">Produtos do fornecedor</h2>
                <p>Veja os produtos vinculados a cada fornecedor.</p>
              </div>
            </div>
            <div className="associacao-formulario">
              <label className="campo">
                <span>Fornecedor</span>
                <select value={fornecedorConsultaId} onChange={evento => setFornecedorConsultaId(evento.target.value)}
                  disabled={carregandoCadastros}>
                  <option value="">Selecione um fornecedor</option>
                  {fornecedores.map(fornecedor => <option key={fornecedor.id} value={fornecedor.id}>{fornecedor.nome}</option>)}
                </select>
              </label>
            </div>
            <div className="associacao-lista-titulo">
              <h3>{fornecedorSelecionado ? `Fornecidos por ${fornecedorSelecionado.nome}` : 'Produtos vinculados'}</h3>
              <span>{produtosDoFornecedor.length} {produtosDoFornecedor.length === 1 ? 'produto' : 'produtos'}</span>
            </div>
            {erroConsulta && <div className="aviso erro associacao-aviso" role="alert">{erroConsulta}</div>}
            {carregandoConsulta ? <div className="estado-lista">Carregando produtos...</div> :
              !fornecedorConsultaId ? <div className="estado-lista">Selecione um fornecedor para consultar seus produtos.</div> :
                produtosDoFornecedor.length === 0 ? <div className="estado-lista">Este fornecedor ainda não tem produtos vinculados.</div> :
                  <ul className="associacao-lista">
                    {produtosDoFornecedor.map(produto => (
                      <li key={produto.id}>
                        <span><strong>{produto.nome}</strong><small>{produto.codigo_barras}</small></span>
                      </li>
                    ))}
                  </ul>}
          </section>
        </div>
      </div>

      {fornecedorRemovido && <div className="modal-fundo" role="presentation">
        <section className="modal modal-pequeno" role="dialog" aria-modal="true" aria-labelledby="remover-vinculo-titulo">
          <div className="modal-topo">
            <div><p className="sobretitulo">CONFIRMAR REMOÇÃO</p><h2 id="remover-vinculo-titulo">Remover vínculo?</h2></div>
            <button className="botao-icone" type="button" onClick={() => setFornecedorRemovido(null)} aria-label="Fechar confirmação" disabled={removendo}><Icone nome="fechar" /></button>
          </div>
          <div className="modal-corpo">
            <p>Remover <strong>{fornecedorRemovido.nome}</strong> de <strong>{produtoSelecionado?.nome}</strong>? Os dois cadastros serão preservados.</p>
            {erroRemocao && <div className="aviso erro" role="alert">{erroRemocao}</div>}
          </div>
          <div className="modal-acoes">
            <button className="botao discreto" type="button" onClick={() => setFornecedorRemovido(null)} disabled={removendo}>Cancelar</button>
            <button className="botao perigo" type="button" onClick={removerVinculo} disabled={removendo}>{removendo ? 'Removendo...' : 'Remover vínculo'}</button>
          </div>
        </section>
      </div>}
    </main>
  );
}
