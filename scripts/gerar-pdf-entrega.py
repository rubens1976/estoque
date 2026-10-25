"""Gera o PDF a partir das evidencias HTTP publicas, sem inventar enderecos."""
import json
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

RAIZ = Path(__file__).resolve().parents[1]
evidencia = json.loads((RAIZ / 'docs/evidencias-api-publica.json').read_text(encoding='utf-8'))
assert len(evidencia['consultas']) == 3
assert all(c['status'] == 200 and c['url'].startswith('https://') for c in evidencia['consultas'])
destino = RAIZ / 'docs/entrega-api-conectabyte.pdf'
vermelho = colors.HexColor('#d71920')
escuro = colors.HexColor('#20222b')
estilo = ParagraphStyle('texto', fontName='Helvetica', fontSize=10, leading=14, textColor=escuro, alignment=TA_LEFT)
titulo = ParagraphStyle('titulo', parent=estilo, fontName='Helvetica-Bold', fontSize=21, leading=25, spaceAfter=10)
subtitulo = ParagraphStyle('subtitulo', parent=estilo, fontName='Helvetica-Bold', fontSize=11, leading=16, textColor=vermelho)
pequeno = ParagraphStyle('pequeno', parent=estilo, fontSize=8, leading=11)
def p(texto, st=estilo):
    return Paragraph(texto, st)

conteudo = [p('ConectaByte', ParagraphStyle('marca', parent=titulo, textColor=vermelho, fontSize=27)),
    p('INFORMÁTICA  |  CONTROLE DE ESTOQUE', pequeno), Spacer(1, 20),
    p('API pública — chamadas para avaliação', titulo),
    p('<b>Autor:</b> Rubens Melo<br/><b>Disciplina:</b> Projeto Integrador — Gran Faculdade<br/><b>Entrega:</b> Fase 2 · Etapa 2'),
    Spacer(1, 10),
    p('<b>Código-fonte:</b> <link href="https://github.com/rubens1976/estoque" color="#d71920">github.com/rubens1976/estoque</link>'),
    p('<b>API:</b> <link href="'+escape(evidencia['base_url'])+'" color="#d71920">'+escape(evidencia['base_url'])+'</link>'),
    p('<b>Verificação HTTP:</b> '+escape(evidencia['verificado_em']), pequeno), Spacer(1, 13),
    p('As três consultas abaixo foram executadas no endereço público HTTPS. No Insomnia, selecionar <b>GET</b>, colar a URL e clicar em <b>Send</b>. Não exigem autenticação, corpo ou cabeçalhos especiais.'), Spacer(1, 15)]

for i, consulta in enumerate(evidencia['consultas'], 1):
    linhas = [[p(f'{i:02d}  GET · {escape(consulta["titulo"])}', subtitulo)],
        [p('<link href="'+escape(consulta['url'])+'" color="#20222b">'+escape(consulta['url'])+'</link>', pequeno)],
        [p(f'<b>Resultado verificado:</b> HTTP {consulta["status"]} · JSON · {consulta["itens"]} registros', estilo)],
        [p(escape(consulta['descricao']), pequeno)]]
    tabela = Table(linhas, colWidths=[A4[0]-96])
    tabela.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#f6f7f9')),
        ('LINEBEFORE',(0,0),(0,-1),3,vermelho),('LEFTPADDING',(0,0),(-1,-1),12),
        ('RIGHTPADDING',(0,0),(-1,-1),12),('TOPPADDING',(0,0),(-1,-1),5),
        ('BOTTOMPADDING',(0,0),(-1,-1),5)]))
    conteudo.extend([tabela, Spacer(1, 12)])

conteudo += [p('<b>Ambiente acadêmico de demonstração</b>', subtitulo),
    p('Hospedagem gratuita no Render com Node.js, Express e SQLite. Após inatividade, a primeira resposta pode demorar cerca de um minuto. O armazenamento é temporário: se o banco for perdido em um reinício, os dados de exemplo serão recriados. Cadastros e movimentos de teste podem alterar os totais durante uma sessão.', pequeno)]

def rodape(canvas, doc):
    canvas.setStrokeColor(vermelho)
    canvas.line(48, 40, A4[0]-48, 40)
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(escuro)
    canvas.drawString(48, 27, 'ConectaByte Informática | Rubens Melo | Projeto Integrador')
    canvas.drawRightString(A4[0]-48, 27, str(doc.page))

SimpleDocTemplate(str(destino), pagesize=A4, leftMargin=48, rightMargin=48,
    topMargin=38, bottomMargin=55, title='ConectaByte — API pública para avaliação',
    author='Rubens Melo').build(conteudo, onFirstPage=rodape, onLaterPages=rodape)
print(destino)
