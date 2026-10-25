import { useEffect, useMemo, useState } from 'react';

const fornecedorVazio = { nome: '', cnpj: '', telefone: '', email: '', endereco: '' };

export default function PaginaFornecedores({ solicitar, Icone, Campo, numero }) {
  const [fornecedores, setFornecedores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [pesquisa, setPesquisa] = useState('');
  const [aviso, setAviso] = useState(null);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [fornecedorEditado, setFornecedorEditado] = useState(null);
  const [formulario, setFormulario] = useState(fornecedorVazio);
  const [erroFormulario, setErroFormulario] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [fornecedorExcluido, setFornecedorExcluido] = useState(null);
  const [erroExclusao, setErroExclusao] = useState('');
  const [excluindo, setExcluindo] = useState(false);

  async function carregarFornecedores(signal) {
    setCarregando(true);
    try {
      const lista = await solicitar('/fornecedores', { signal });
      setFornecedores(lista);
      setAviso(null);
      return true;
    } catch (erro) {
      if (erro.name !== 'AbortError') {
        setAviso({ tipo: 'erro', texto: `Não foi possível carregar os fornecedores. ${erro.message}` });
      }
      return false;
    } finally {
      if (!signal?.aborted) setCarregando(false);
    }
  }

  useEffect(() => {
    const controlador = new AbortController();
    carregarFornecedores(controlador.signal);
    return () => controlador.abort();
  }, []);

  const fornecedoresFiltrados = useMemo(() => {
    const termo = pesquisa.trim().toLocaleLowerCase('pt-BR');
    if (!termo) return fornecedores;
    return fornecedores.filter(fornecedor => [fornecedor.nome, fornecedor.cnpj, fornecedor.email, fornecedor.endereco]
      .some(valor => String(valor || '').toLocaleLowerCase('pt-BR').includes(termo)));
  }, [fornecedores, pesquisa]);

  function abrirCadastro() {
    setFornecedorEditado(null);
    setFormulario(fornecedorVazio);
    setErroFormulario('');
    setFormularioAberto(true);
  }

  function abrirEdicao(fornecedor) {
    setFornecedorEditado(fornecedor);
    setFormulario({
      nome: fornecedor.nome,
      cnpj: fornecedor.cnpj,
      telefone: fornecedor.telefone || '',
      email: fornecedor.email || '',
      endereco: fornecedor.endereco || ''
    });
    setErroFormulario('');
    setFormularioAberto(true);
  }

  function alterarCampo(evento) {
    const { name, value } = evento.target;
    setFormulario(atual => ({ ...atual, [name]: value }));
  }

  async function salvarFornecedor(evento) {
    evento.preventDefault();
    if (!formulario.nome.trim() || !formulario.cnpj.trim()) {
      setErroFormulario('Informe o nome e o CNPJ do fornecedor.');
      return;
    }

    const dados = Object.fromEntries(Object.entries(formulario).map(([chave, valor]) => [chave, valor.trim()]));
    setSalvando(true);
    setErroFormulario('');
    try {
      await solicitar(fornecedorEditado ? `/fornecedores/${fornecedorEditado.id}` : '/fornecedores', {
        method: fornecedorEditado ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      });
      setFormularioAberto(false);
      if (await carregarFornecedores()) {
        setAviso({ tipo: 'sucesso', texto: fornecedorEditado ? 'Fornecedor atualizado.' : 'Fornecedor cadastrado.' });
      }
    } catch (erro) {
      setErroFormulario(erro.message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluirFornecedor() {
    if (!fornecedorExcluido) return;
    setExcluindo(true);
    setErroExclusao('');
    try {
      await solicitar(`/fornecedores/${fornecedorExcluido.id}`, { method: 'DELETE' });
      setFornecedorExcluido(null);
      if (await carregarFornecedores()) {
        setAviso({ tipo: 'sucesso', texto: 'Fornecedor excluído.' });
      }
    } catch (erro) {
      setErroExclusao(erro.message);
    } finally {
      setExcluindo(false);
    }
  }

  return <>
    <main className="conteudo">
      <header className="topo">
        <div className="caminho">Painel <span>/</span> Fornecedores</div>
        <span className="topo-selo">ConectaByte Informática</span>
      </header>

      <div className="pagina">
        <div className="titulo-linha">
          <div>
            <p className="sobretitulo">CONTROLE DE ESTOQUE</p>
            <h1>Fornecedores</h1>
            <p className="subtitulo">Gerencie os parceiros que abastecem a loja.</p>
          </div>
          <button className="botao primario" type="button" onClick={abrirCadastro}>
            <Icone nome="mais" tamanho={18} /> Novo fornecedor
          </button>
        </div>

        <section className="resumo resumo-fornecedores" aria-label="Resumo de fornecedores">
          <div className="resumo-cartao"><span>Fornecedores cadastrados</span><strong>{numero.format(fornecedores.length)}</strong></div>
          <div className="resumo-cartao"><span>Com telefone</span><strong>{numero.format(fornecedores.filter(item => item.telefone).length)}</strong></div>
          <div className="resumo-cartao"><span>Com e-mail</span><strong>{numero.format(fornecedores.filter(item => item.email).length)}</strong></div>
        </section>

        {aviso && <div className={`aviso ${aviso.tipo}`} role="status">{aviso.texto}</div>}

        <section className="painel" aria-label="Lista de fornecedores">
          <div className="painel-topo">
            <div>
              <h2>Lista de fornecedores</h2>
              <p>{fornecedores.length} {fornecedores.length === 1 ? 'fornecedor cadastrado' : 'fornecedores cadastrados'}</p>
            </div>
            <div className="ferramentas">
              <label className="busca">
                <Icone nome="busca" tamanho={18} />
                <input aria-label="Buscar fornecedores" placeholder="Buscar por nome, CNPJ ou cidade" value={pesquisa}
                  onChange={evento => setPesquisa(evento.target.value)} />
              </label>
              <button className="botao-icone" type="button" onClick={() => carregarFornecedores()}
                aria-label="Atualizar fornecedores" title="Atualizar fornecedores" disabled={carregando}>
                <Icone nome="atualizar" tamanho={19} />
              </button>
            </div>
          </div>

          {carregando ? <div className="estado-lista">Carregando fornecedores...</div> :
            fornecedoresFiltrados.length === 0 ?
              <div className="estado-lista">
                <span className="estado-icone"><Icone nome="fornecedores" tamanho={28} /></span>
                <strong>{pesquisa ? 'Nenhum fornecedor encontrado' : 'Nenhum fornecedor cadastrado'}</strong>
                <p>{pesquisa ? 'Tente buscar por outro nome, CNPJ, cidade ou UF.' : 'Comece cadastrando o primeiro fornecedor.'}</p>
                {!pesquisa && <button className="botao secundario" type="button" onClick={abrirCadastro}>Cadastrar fornecedor</button>}
              </div> :
              <div className="tabela-rolagem">
                <table>
                  <thead><tr><th>FORNECEDOR</th><th>CNPJ</th><th>TELEFONE</th><th>E-MAIL</th><th>AÇÕES</th></tr></thead>
                  <tbody>
                    {fornecedoresFiltrados.map(fornecedor => (
                      <tr key={fornecedor.id}>
                        <td><div className="produto-celula"><span className="produto-avatar">{fornecedor.nome.charAt(0).toUpperCase()}</span>
                          <span><strong>{fornecedor.nome}</strong><small>{fornecedor.endereco || 'Sem endereço'}</small></span></div></td>
                        <td><span className="codigo">{fornecedor.cnpj}</span></td>
                        <td>{fornecedor.telefone || '—'}</td>
                        <td>{fornecedor.email || '—'}</td>
                        <td><div className="acoes">
                          <button type="button" className="acao" onClick={() => abrirEdicao(fornecedor)} aria-label={`Editar ${fornecedor.nome}`} title="Editar fornecedor"><Icone nome="editar" tamanho={18} /></button>
                          <button type="button" className="acao excluir" onClick={() => { setErroExclusao(''); setFornecedorExcluido(fornecedor); }} aria-label={`Excluir ${fornecedor.nome}`} title="Excluir fornecedor"><Icone nome="lixeira" tamanho={18} /></button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>}
          <div className="painel-rodape">Exibindo {fornecedoresFiltrados.length} de {fornecedores.length} fornecedores</div>
        </section>
      </div>
    </main>

    {formularioAberto && <div className="modal-fundo" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="fornecedor-form-titulo">
        <div className="modal-topo">
          <div><p className="sobretitulo">CADASTRO DE FORNECEDORES</p><h2 id="fornecedor-form-titulo">{fornecedorEditado ? 'Editar fornecedor' : 'Novo fornecedor'}</h2></div>
          <button className="botao-icone" type="button" onClick={() => setFormularioAberto(false)} aria-label="Fechar formulário" disabled={salvando}><Icone nome="fechar" /></button>
        </div>
        <form onSubmit={salvarFornecedor}>
          <div className="modal-corpo">
            <Campo rotulo="Nome do fornecedor *" nome="nome" valor={formulario.nome} aoAlterar={alterarCampo} required autoFocus maxLength={120} placeholder="Ex.: Distribuidora de Informática" />
            <Campo rotulo="CNPJ *" nome="cnpj" valor={formulario.cnpj} aoAlterar={alterarCampo} required maxLength={18} placeholder="00.000.000/0000-00" />
            <div className="campos-lado-a-lado">
              <Campo rotulo="Telefone" nome="telefone" valor={formulario.telefone} aoAlterar={alterarCampo} type="tel" placeholder="(11) 99999-9999" />
              <Campo rotulo="E-mail" nome="email" valor={formulario.email} aoAlterar={alterarCampo} type="email" placeholder="contato@exemplo.com" />
            </div>
            <Campo rotulo="Endereço" nome="endereco" valor={formulario.endereco} aoAlterar={alterarCampo} placeholder="Rua e número" />
            {erroFormulario && <div className="aviso erro" role="alert">{erroFormulario}</div>}
          </div>
          <div className="modal-acoes">
            <button className="botao discreto" type="button" onClick={() => setFormularioAberto(false)} disabled={salvando}>Cancelar</button>
            <button className="botao primario" type="submit" disabled={salvando}>{salvando ? 'Salvando...' : fornecedorEditado ? 'Salvar alterações' : 'Cadastrar fornecedor'}</button>
          </div>
        </form>
      </section>
    </div>}

    {fornecedorExcluido && <div className="modal-fundo" role="presentation">
      <section className="modal modal-pequeno" role="dialog" aria-modal="true" aria-labelledby="fornecedor-excluir-titulo">
        <div className="modal-topo">
          <div><p className="sobretitulo">CONFIRMAR EXCLUSÃO</p><h2 id="fornecedor-excluir-titulo">Excluir fornecedor?</h2></div>
          <button className="botao-icone" type="button" onClick={() => setFornecedorExcluido(null)} aria-label="Fechar confirmação" disabled={excluindo}><Icone nome="fechar" /></button>
        </div>
        <div className="modal-corpo"><p>O fornecedor <strong>{fornecedorExcluido.nome}</strong> e seus vínculos com produtos serão removidos. Os produtos serão preservados.</p>
          {erroExclusao && <div className="aviso erro" role="alert">{erroExclusao}</div>}</div>
        <div className="modal-acoes">
          <button className="botao discreto" type="button" onClick={() => setFornecedorExcluido(null)} disabled={excluindo}>Cancelar</button>
          <button className="botao perigo" type="button" onClick={excluirFornecedor} disabled={excluindo}>{excluindo ? 'Excluindo...' : 'Excluir fornecedor'}</button>
        </div>
      </section>
    </div>}
  </>;
}
