import { useEffect, useMemo, useState } from 'react';
import PaginaFornecedores from './Fornecedores.jsx';
import PaginaUnidades from './Unidades.jsx';
import PaginaAssociacoes from './Associacoes.jsx';

const API = '/api';
const produtoVazio = {
  nome: '',
  descricao: '',
  codigo_barras: '',
  preco: '',
  quantidade: '0'
};
const moeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});
const numero = new Intl.NumberFormat('pt-BR');

async function solicitar(caminho, opcoes = {}) {
  const resposta = await fetch(`${API}${caminho}`, opcoes);
  const texto = await resposta.text();
  let dados;

  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    dados = null;
  }

  if (!resposta.ok) {
    throw new Error(dados?.erro || `A solicitação falhou (${resposta.status}).`);
  }

  return dados;
}

function Marca() {
  return (
    <div className="marca" aria-label="ConectaByte Informática">
      <svg className="marca-simbolo" viewBox="0 0 64 64" aria-hidden="true">
        <path d="M50 7H29C16 7 6 18 6 32s10 25 23 25h21V45H29c-7 0-11-6-11-13s4-13 11-13h21V7Z" fill="currentColor" />
        <path d="M4 29h19l8 8h20" fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
        <rect x="1" y="25" width="10" height="9" rx="1" fill="currentColor" />
        <rect x="47" y="33" width="12" height="9" rx="1" fill="currentColor" />
      </svg>
      <span className="marca-texto">
        <strong>ConectaByte</strong>
        <small>INFORMÁTICA</small>
      </span>
    </div>
  );
}

function Icone({ nome, tamanho = 20 }) {
  const caminhos = {
    caixa: <><path d="M3 7 12 3l9 4v10l-9 4-9-4V7Z" /><path d="m3 7 9 4 9-4M12 11v10" /></>,
    fornecedores: <><path d="M3 20V6l9-3 9 3v14H3Z" /><path d="M8 9h2M14 9h2M8 13h2M14 13h2M10 20v-4h4v4" /></>,
    unidades: <><path d="M3 21h18M5 21V7l7-4 7 4v14M9 10h2M14 10h2M9 14h2M14 14h2M11 21v-4h2v4" /></>,
    associacoes: <><path d="M9 8h6M9 16h6" /><circle cx="5" cy="8" r="2" /><circle cx="19" cy="16" r="2" /><path d="M7 8h2M15 16h2M12 8v8" /></>,
    busca: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    mais: <path d="M12 4v16M4 12h16" />,
    editar: <><path d="M4 20h4l12-12-4-4L4 16v4Z" /><path d="m14 6 4 4" /></>,
    lixeira: <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" /></>,
    fechar: <path d="M5 5 19 19M19 5 5 19" />,
    atualizar: <><path d="M20 8a8 8 0 0 0-14-2L4 8M4 4v4h4M4 16a8 8 0 0 0 14 2l2-2M20 20v-4h-4" /></>
  };

  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      {caminhos[nome]}
    </svg>
  );
}

function Campo({ rotulo, nome, valor, aoAlterar, ...atributos }) {
  return (
    <label className="campo">
      <span>{rotulo}</span>
      <input name={nome} value={valor} onChange={aoAlterar} {...atributos} />
    </label>
  );
}

export default function App() {
  const [paginaAtiva, setPaginaAtiva] = useState('produtos');

  useEffect(() => {
    const titulos = { produtos: 'Produtos', fornecedores: 'Fornecedores', associacoes: 'Associações', unidades: 'Unidades' };
    document.title = `${titulos[paginaAtiva]} | ConectaByte Informática`;
  }, [paginaAtiva]);
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [pesquisa, setPesquisa] = useState('');
  const [aviso, setAviso] = useState(null);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [produtoEditado, setProdutoEditado] = useState(null);
  const [formulario, setFormulario] = useState(produtoVazio);
  const [erroFormulario, setErroFormulario] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [produtoExcluido, setProdutoExcluido] = useState(null);
  const [erroExclusao, setErroExclusao] = useState('');
  const [excluindo, setExcluindo] = useState(false);

  async function carregarProdutos(signal) {
    setCarregando(true);
    try {
      const lista = await solicitar('/produtos', { signal });
      setProdutos(lista);
      setAviso(null);
      return true;
    } catch (erro) {
      if (erro.name !== 'AbortError') {
        setAviso({ tipo: 'erro', texto: `Não foi possível carregar os produtos. ${erro.message}` });
      }
      return false;
    } finally {
      if (!signal?.aborted) setCarregando(false);
    }
  }

  useEffect(() => {
    if (paginaAtiva !== 'produtos') return;
    const controlador = new AbortController();
    carregarProdutos(controlador.signal);
    return () => controlador.abort();
  }, [paginaAtiva]);

  const produtosFiltrados = useMemo(() => {
    const termo = pesquisa.trim().toLocaleLowerCase('pt-BR');
    if (!termo) return produtos;
    return produtos.filter(produto => [produto.nome, produto.descricao, produto.codigo_barras]
      .some(valor => String(valor || '').toLocaleLowerCase('pt-BR').includes(termo)));
  }, [produtos, pesquisa]);

  const resumo = useMemo(() => ({
    unidades: produtos.reduce((soma, produto) => soma + produto.quantidade, 0),
    valor: produtos.reduce((soma, produto) => soma + produto.preco * produto.quantidade, 0)
  }), [produtos]);

  function abrirCadastro() {
    setProdutoEditado(null);
    setFormulario(produtoVazio);
    setErroFormulario('');
    setFormularioAberto(true);
  }

  function abrirEdicao(produto) {
    setProdutoEditado(produto);
    setFormulario({
      nome: produto.nome,
      descricao: produto.descricao || '',
      codigo_barras: produto.codigo_barras,
      preco: String(produto.preco),
      quantidade: String(produto.quantidade)
    });
    setErroFormulario('');
    setFormularioAberto(true);
  }

  function alterarCampo(evento) {
    const { name, value } = evento.target;
    setFormulario(atual => ({ ...atual, [name]: value }));
  }

  async function salvarProduto(evento) {
    evento.preventDefault();
    const preco = Number(formulario.preco.trim().replace(',', '.'));
    const quantidade = Number(formulario.quantidade.trim());

    if (!formulario.nome.trim() || !formulario.codigo_barras.trim()) {
      setErroFormulario('Informe o nome e o código de barras.');
      return;
    }
    if (!formulario.preco.trim() || !Number.isFinite(preco) || preco < 0) {
      setErroFormulario('Informe um preço maior ou igual a zero.');
      return;
    }
    if (!/^\d+$/.test(formulario.quantidade.trim()) || !Number.isSafeInteger(quantidade)) {
      setErroFormulario('Informe uma quantidade inteira maior ou igual a zero.');
      return;
    }

    const dados = {
      nome: formulario.nome.trim(),
      descricao: formulario.descricao.trim(),
      codigo_barras: formulario.codigo_barras.trim(),
      preco,
      quantidade
    };
    setSalvando(true);
    setErroFormulario('');
    try {
      await solicitar(produtoEditado ? `/produtos/${produtoEditado.id}` : '/produtos', {
        method: produtoEditado ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      });
      setFormularioAberto(false);
      if (await carregarProdutos()) {
        setAviso({ tipo: 'sucesso', texto: produtoEditado ? 'Produto atualizado.' : 'Produto cadastrado.' });
      }
    } catch (erro) {
      setErroFormulario(erro.message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluirProduto() {
    if (!produtoExcluido) return;
    setExcluindo(true);
    setErroExclusao('');
    try {
      await solicitar(`/produtos/${produtoExcluido.id}`, { method: 'DELETE' });
      setProdutoExcluido(null);
      if (await carregarProdutos()) {
        setAviso({ tipo: 'sucesso', texto: 'Produto excluído.' });
      }
    } catch (erro) {
      setErroExclusao(erro.message);
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="barra-lateral">
        <Marca />
        <div className="barra-separador" />
        <p className="menu-legenda">PAINEL DE CONTROLE</p>
        <nav aria-label="Navegação principal">
          <button type="button" className={`menu-item ${paginaAtiva === 'produtos' ? 'ativo' : ''}`}
            onClick={() => setPaginaAtiva('produtos')} aria-current={paginaAtiva === 'produtos' ? 'page' : undefined}>
            <Icone nome="caixa" /> Produtos
          </button>
          <button type="button" className={`menu-item ${paginaAtiva === 'fornecedores' ? 'ativo' : ''}`}
            onClick={() => setPaginaAtiva('fornecedores')} aria-current={paginaAtiva === 'fornecedores' ? 'page' : undefined}>
            <Icone nome="fornecedores" /> Fornecedores
          </button>
          <button type="button" className={`menu-item ${paginaAtiva === 'associacoes' ? 'ativo' : ''}`}
            onClick={() => setPaginaAtiva('associacoes')} aria-current={paginaAtiva === 'associacoes' ? 'page' : undefined}>
            <Icone nome="associacoes" /> Associações
          </button>
          <button type="button" className={`menu-item ${paginaAtiva === 'unidades' ? 'ativo' : ''}`}
            onClick={() => setPaginaAtiva('unidades')} aria-current={paginaAtiva === 'unidades' ? 'page' : undefined}>
            <Icone nome="unidades" /> Unidades
          </button>
        </nav>
        <div className="barra-rodape">Tecnologia para o seu dia a dia.</div>
      </aside>

      {paginaAtiva === 'fornecedores' && <PaginaFornecedores solicitar={solicitar} Icone={Icone} Campo={Campo} numero={numero} />}
      {paginaAtiva === 'associacoes' && <PaginaAssociacoes solicitar={solicitar} Icone={Icone} numero={numero} />}
      {paginaAtiva === 'unidades' && <PaginaUnidades solicitar={solicitar} Icone={Icone} moeda={moeda} numero={numero} />}

      {paginaAtiva === 'produtos' && <main className="conteudo">
        <header className="topo">
          <div className="caminho">Painel <span>/</span> Produtos</div>
          <span className="topo-selo">ConectaByte Informática</span>
        </header>

        <div className="pagina">
          <div className="titulo-linha">
            <div>
              <p className="sobretitulo">CONTROLE DE ESTOQUE</p>
              <h1>Produtos</h1>
              <p className="subtitulo">Acompanhe e organize os itens cadastrados na loja.</p>
            </div>
            <button className="botao primario" type="button" onClick={abrirCadastro}>
              <Icone nome="mais" tamanho={18} /> Novo produto
            </button>
          </div>

          <section className="resumo" aria-label="Resumo do estoque">
            <div className="resumo-cartao"><span>Produtos cadastrados</span><strong>{numero.format(produtos.length)}</strong></div>
            <div className="resumo-cartao"><span>Unidades em estoque</span><strong>{numero.format(resumo.unidades)}</strong></div>
            <div className="resumo-cartao"><span>Valor em estoque</span><strong>{moeda.format(resumo.valor)}</strong></div>
          </section>

          {aviso && <div className={`aviso ${aviso.tipo}`} role="status">{aviso.texto}</div>}

          <section className="painel" aria-label="Lista de produtos">
            <div className="painel-topo">
              <div>
                <h2>Lista de produtos</h2>
                <p>{produtos.length} {produtos.length === 1 ? 'item cadastrado' : 'itens cadastrados'}</p>
              </div>
              <div className="ferramentas">
                <label className="busca">
                  <Icone nome="busca" tamanho={18} />
                  <input aria-label="Buscar produtos" placeholder="Buscar por nome ou código" value={pesquisa}
                    onChange={evento => setPesquisa(evento.target.value)} />
                </label>
                <button className="botao-icone" type="button" onClick={() => carregarProdutos()}
                  aria-label="Atualizar produtos" title="Atualizar produtos" disabled={carregando}>
                  <Icone nome="atualizar" tamanho={19} />
                </button>
              </div>
            </div>

            {carregando ? <div className="estado-lista">Carregando produtos...</div> :
              produtosFiltrados.length === 0 ?
                <div className="estado-lista">
                  <span className="estado-icone"><Icone nome="caixa" tamanho={28} /></span>
                  <strong>{pesquisa ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}</strong>
                  <p>{pesquisa ? 'Tente buscar por outro nome ou código.' : 'Comece cadastrando o primeiro produto.'}</p>
                  {!pesquisa && <button className="botao secundario" type="button" onClick={abrirCadastro}>Cadastrar produto</button>}
                </div> :
                <div className="tabela-rolagem">
                  <table>
                    <thead><tr><th>PRODUTO</th><th>CÓDIGO DE BARRAS</th><th>PREÇO</th><th>ESTOQUE</th><th>AÇÕES</th></tr></thead>
                    <tbody>
                      {produtosFiltrados.map(produto => (
                        <tr key={produto.id}>
                          <td><div className="produto-celula"><span className="produto-avatar">{produto.nome.charAt(0).toUpperCase()}</span>
                            <span><strong>{produto.nome}</strong><small>{produto.descricao || 'Sem descrição'}</small></span></div></td>
                          <td><span className="codigo">{produto.codigo_barras}</span></td>
                          <td className="preco">{moeda.format(produto.preco)}</td>
                          <td><span className={`estoque-pill ${produto.quantidade === 0 ? 'zerado' : ''}`}>{numero.format(produto.quantidade)} un.</span></td>
                          <td><div className="acoes">
                            <button type="button" className="acao" onClick={() => abrirEdicao(produto)} aria-label={`Editar ${produto.nome}`} title="Editar produto"><Icone nome="editar" tamanho={18} /></button>
                            <button type="button" className="acao excluir" onClick={() => { setErroExclusao(''); setProdutoExcluido(produto); }} aria-label={`Excluir ${produto.nome}`} title="Excluir produto"><Icone nome="lixeira" tamanho={18} /></button>
                          </div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>}
            <div className="painel-rodape">Exibindo {produtosFiltrados.length} de {produtos.length} produtos</div>
          </section>
        </div>
      </main>}

      {paginaAtiva === 'produtos' && formularioAberto && (
        <div className="modal-fundo" role="presentation">
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="form-titulo">
            <div className="modal-topo">
              <div><p className="sobretitulo">CADASTRO DE PRODUTOS</p><h2 id="form-titulo">{produtoEditado ? 'Editar produto' : 'Novo produto'}</h2></div>
              <button className="botao-icone" type="button" onClick={() => setFormularioAberto(false)} aria-label="Fechar formulário" disabled={salvando}><Icone nome="fechar" /></button>
            </div>
            <form onSubmit={salvarProduto}>
              <div className="modal-corpo">
                <Campo rotulo="Nome do produto *" nome="nome" valor={formulario.nome} aoAlterar={alterarCampo} required autoFocus maxLength={120} placeholder="Ex.: Teclado USB" />
                <Campo rotulo="Descrição" nome="descricao" valor={formulario.descricao} aoAlterar={alterarCampo} maxLength={500} placeholder="Detalhes do produto" />
                <Campo rotulo="Código de barras *" nome="codigo_barras" valor={formulario.codigo_barras} aoAlterar={alterarCampo} required maxLength={80} placeholder="Ex.: 7891234567890" />
                <div className="campos-lado-a-lado">
                  <Campo rotulo="Preço (R$) *" nome="preco" valor={formulario.preco} aoAlterar={alterarCampo} required inputMode="decimal" placeholder="0,00" />
                  <Campo rotulo={produtoEditado ? 'Quantidade total' : 'Estoque inicial na sede *'} nome="quantidade" valor={formulario.quantidade} aoAlterar={alterarCampo} disabled={!!produtoEditado} required inputMode="numeric" placeholder="0" />
                </div>
                {produtoEditado && <p>Para alterar saldos, registre uma movimentação em Unidades.</p>}
                {erroFormulario && <div className="aviso erro" role="alert">{erroFormulario}</div>}
              </div>
              <div className="modal-acoes">
                <button className="botao discreto" type="button" onClick={() => setFormularioAberto(false)} disabled={salvando}>Cancelar</button>
                <button className="botao primario" type="submit" disabled={salvando}>{salvando ? 'Salvando...' : produtoEditado ? 'Salvar alterações' : 'Cadastrar produto'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {paginaAtiva === 'produtos' && produtoExcluido && (
        <div className="modal-fundo" role="presentation">
          <section className="modal modal-pequeno" role="dialog" aria-modal="true" aria-labelledby="excluir-titulo">
            <div className="modal-topo">
              <div><p className="sobretitulo">CONFIRMAR EXCLUSÃO</p><h2 id="excluir-titulo">Excluir produto?</h2></div>
              <button className="botao-icone" type="button" onClick={() => setProdutoExcluido(null)} aria-label="Fechar confirmação" disabled={excluindo}><Icone nome="fechar" /></button>
            </div>
            <div className="modal-corpo"><p>O produto <strong>{produtoExcluido.nome}</strong> será removido do estoque.</p>
              {erroExclusao && <div className="aviso erro" role="alert">{erroExclusao}</div>}</div>
            <div className="modal-acoes">
              <button className="botao discreto" type="button" onClick={() => setProdutoExcluido(null)} disabled={excluindo}>Cancelar</button>
              <button className="botao perigo" type="button" onClick={excluirProduto} disabled={excluindo}>{excluindo ? 'Excluindo...' : 'Excluir produto'}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
