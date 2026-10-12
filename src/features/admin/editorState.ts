// Estado do editor de propostas (docs/07-propostas-de-redacao.md, A5): o que a tela mostra, como vira o JSON do
// cadastro e como as pendências da API apontam para os campos. Tudo aqui é função pura, sem tela.

import type { Schemas } from '../../lib/api';

export type BlockKind = 'collection_item' | 'command' | 'instructions' | 'heading' | 'paragraph' | 'divider';
export type CollectionFormat = 'prose' | 'verse' | 'image';

export type EditorBlock = {
  /** Identidade na tela, estável enquanto o editor está aberto. */
  key: string;
  /** Id do bloco no backend, quando ele já foi salvo. */
  id?: string;
  position: number;
  kind: BlockKind;
  label: string;
  format: CollectionFormat;
  source: string;
  body: string;
  /** Verso: um texto por coluna, um verso por linha. */
  columns: string[];
  assetId: string | null;
  imageUrl: string | null;
  alt: string;
  aiDescription: string;
  /** Instruções: título da seção. Título de seção: o texto dele. */
  title: string;
  /** Instruções: um item por linha. */
  items: string;
};

export type EditorPrompt = {
  exam: string;
  slug: string;
  title: string;
  summary: string;
  sourceLabel: string;
  essayType: string;
  genreLabel: string;
  minLines: string;
  maxLines: string;
  titleRequired: boolean;
  blocks: EditorBlock[];
  expectedFocus: string;
  tangentSignals: string;
  offTopicSignals: string;
  /** Um dado-chave por linha. */
  keyData: string;
  extra: string;
};

export const KIND_LABEL: Record<BlockKind, string> = {
  collection_item: 'Coletânea',
  command: 'Comando',
  instructions: 'Instruções',
  heading: 'Título de seção',
  paragraph: 'Parágrafo',
  divider: 'Separador',
};

export const FORMAT_LABEL: Record<CollectionFormat, string> = { prose: 'Texto', verse: 'Verso', image: 'Imagem' };

export const MAX_COLUMNS = 4;

let nextKey = 0;
const newKey = () => `b${++nextKey}`;

const lines = (text: string) => text.split('\n').map((line) => line.trim()).filter(Boolean);

const isKind = (kind: unknown): kind is BlockKind => typeof kind === 'string' && kind in KIND_LABEL;
const isFormat = (format: unknown): format is CollectionFormat => format === 'prose' || format === 'verse' || format === 'image';

function emptyBlock(kind: BlockKind, position: number): EditorBlock {
  return {
    key: newKey(),
    position,
    kind,
    label: '',
    format: 'prose',
    source: '',
    body: '',
    columns: [''],
    assetId: null,
    imageUrl: null,
    alt: '',
    aiDescription: '',
    title: kind === 'instructions' ? 'Instruções' : '',
    items: '',
  };
}

/** Os blocos na ordem das posições, renumerados de 10 em 10: sobra espaço para inserir no meio depois. */
export function renumber(blocks: EditorBlock[]): EditorBlock[] {
  return [...blocks]
    .map((block, index) => ({ block, index }))
    .sort((a, b) => a.block.position - b.block.position || a.index - b.index)
    .map(({ block }, index) => ({ ...block, position: (index + 1) * 10 }));
}

/** A proposta sempre tem o cartão de instruções; se o que veio não tem, ele entra no fim. */
function withInstructions(blocks: EditorBlock[]): EditorBlock[] {
  return blocks.some((block) => block.kind === 'instructions')
    ? blocks
    : [...blocks, emptyBlock('instructions', (blocks.at(-1)?.position ?? 0) + 10)];
}

export function fromApi(prompt: Schemas['PromptAdminDto']): EditorPrompt {
  const blocks = prompt.blocks.flatMap((block): EditorBlock[] => {
    if (!isKind(block.kind)) {
      return [];
    }
    const data = block.data ?? {};
    return [
      {
        ...emptyBlock(block.kind, block.position ?? 0),
        id: block.id ?? undefined,
        label: data.label ?? '',
        format: isFormat(data.format) ? data.format : 'prose',
        source: data.source ?? '',
        body: data.body ?? '',
        columns: data.columns?.length ? data.columns.map((column) => column.join('\n')) : [''],
        assetId: data.assetId ?? null,
        imageUrl: data.imageUrl ?? null,
        alt: data.alt ?? '',
        aiDescription: data.aiDescription ?? '',
        title: (block.kind === 'heading' ? data.text : data.title) ?? (block.kind === 'instructions' ? 'Instruções' : ''),
        items: (data.items ?? []).join('\n'),
      },
    ];
  });
  const notes = prompt.gradingNotes;

  return {
    exam: prompt.exam,
    slug: prompt.slug,
    title: prompt.title,
    summary: prompt.summary ?? '',
    sourceLabel: prompt.sourceLabel ?? '',
    essayType: prompt.essayType ?? '',
    genreLabel: prompt.genreLabel ?? '',
    minLines: prompt.sheet.minLines?.toString() ?? '',
    maxLines: prompt.sheet.maxLines?.toString() ?? '',
    titleRequired: prompt.sheet.titleRequired ?? false,
    blocks: withInstructions([...blocks].sort((a, b) => a.position - b.position)),
    expectedFocus: notes.expectedFocus ?? '',
    tangentSignals: notes.tangentSignals ?? '',
    offTopicSignals: notes.offTopicSignals ?? '',
    keyData: (notes.keyData ?? []).join('\n'),
    extra: notes.extra ?? '',
  };
}

const number = (text: string) => (/^\d+$/.test(text.trim()) ? Number(text.trim()) : null);

function blockData(block: EditorBlock): Schemas['PromptBlockDataDto'] {
  switch (block.kind) {
    case 'collection_item': {
      const common = { label: block.label, format: block.format, source: block.source };
      if (block.format === 'verse') {
        // Verso vazio no meio separa estrofes; os do fim da coluna são sobra de digitação.
        return { ...common, columns: block.columns.map((column) => column.replace(/\s+$/, '').split('\n')) };
      }
      return block.format === 'image'
        ? { ...common, assetId: block.assetId, alt: block.alt, aiDescription: block.aiDescription }
        : { ...common, body: block.body };
    }
    case 'command':
    case 'paragraph':
      return { body: block.body };
    case 'instructions':
      return { title: block.title, items: lines(block.items) };
    case 'heading':
      return { text: block.title };
    default:
      return {};
  }
}

/** O JSON do cadastro (formato de importação), como o backend recebe no salvamento. */
export function toDocument(prompt: EditorPrompt, expectedUpdatedAt?: string): Schemas['PromptDocument'] {
  return {
    exam: prompt.exam,
    slug: prompt.slug,
    title: prompt.title,
    summary: prompt.summary,
    sourceLabel: prompt.sourceLabel,
    essayType: prompt.essayType || null,
    genreLabel: prompt.genreLabel,
    sheet: { minLines: number(prompt.minLines), maxLines: number(prompt.maxLines), titleRequired: prompt.titleRequired },
    blocks: prompt.blocks.map((block) => ({ id: block.id ?? null, position: block.position, kind: block.kind, data: blockData(block) })),
    gradingNotes: {
      expectedFocus: prompt.expectedFocus,
      tangentSignals: prompt.tangentSignals,
      offTopicSignals: prompt.offTopicSignals,
      keyData: lines(prompt.keyData),
      extra: prompt.extra,
    },
    ...(expectedUpdatedAt ? { expectedUpdatedAt } : {}),
  };
}

/** A proposta como a página do aluno a recebe, para a prévia. */
export function toPreviewBlocks(prompt: EditorPrompt): Schemas['PromptBlockPublicDto'][] {
  return prompt.blocks.map((block) => {
    // O aluno não recebe o id do arquivo nem a descrição feita para a IA.
    const data = { ...blockData(block) };
    delete data.assetId;
    delete data.aiDescription;
    return { position: block.position, kind: block.kind, data: { ...data, imageUrl: block.kind === 'collection_item' && block.format === 'image' ? block.imageUrl : undefined } };
  });
}

export function addBlock(blocks: EditorBlock[], kind: Exclude<BlockKind, 'instructions'>): EditorBlock[] {
  const block = emptyBlock(kind, 0);
  if (kind === 'collection_item') {
    block.label = `Texto ${blocks.filter((item) => item.kind === 'collection_item').length + 1}`;
  }

  // Texto da coletânea entra depois do último texto; os outros, logo antes das instruções.
  const collection = blocks.filter((item) => item.kind === 'collection_item');
  const instructions = blocks.find((item) => item.kind === 'instructions');
  const after = kind === 'collection_item' ? collection.at(-1) : undefined;
  block.position = after ? after.position + 5 : instructions && kind !== 'collection_item' ? instructions.position - 5 : kind === 'collection_item' ? 5 : (blocks.at(-1)?.position ?? 0) + 5;
  return renumber([...blocks, block]);
}

export function duplicateBlock(blocks: EditorBlock[], key: string): EditorBlock[] {
  const original = blocks.find((block) => block.key === key);
  if (!original || original.kind === 'instructions') {
    return blocks;
  }
  // A cópia é um bloco novo: sem o id do original e com outro rótulo, que precisa ser único.
  const copy = { ...original, key: newKey(), id: undefined, position: original.position + 5, label: original.label ? `${original.label} (cópia)` : '' };
  return renumber([...blocks, copy]);
}

export function removeBlock(blocks: EditorBlock[], key: string): EditorBlock[] {
  return renumber(blocks.filter((block) => block.key !== key || block.kind === 'instructions'));
}

/** Sobe ou desce um bloco uma casa. */
export function moveBlock(blocks: EditorBlock[], key: string, direction: -1 | 1): EditorBlock[] {
  const index = blocks.findIndex((block) => block.key === key);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= blocks.length) {
    return blocks;
  }
  const moved = [...blocks];
  [moved[index], moved[target]] = [moved[target]!, moved[index]!];
  return moved.map((block, position) => ({ ...block, position: (position + 1) * 10 }));
}

/** Leva um bloco para o lugar de outro (arrastar e soltar). */
export function dropBlock(blocks: EditorBlock[], key: string, onKey: string): EditorBlock[] {
  const from = blocks.findIndex((block) => block.key === key);
  const to = blocks.findIndex((block) => block.key === onKey);
  if (from < 0 || to < 0 || from === to) {
    return blocks;
  }
  const moved = [...blocks];
  const [block] = moved.splice(from, 1);
  moved.splice(to, 0, block!);
  return moved.map((item, position) => ({ ...item, position: (position + 1) * 10 }));
}

/** Posição digitada: o bloco vai para o lugar dela e todos são renumerados. */
export function setPosition(blocks: EditorBlock[], key: string, position: number): EditorBlock[] {
  const current = blocks.find((block) => block.key === key);
  if (!current || !Number.isFinite(position) || position < 0) {
    return blocks;
  }
  // Meio ponto para o lado de onde veio: digitar a posição de outro bloco coloca este no lugar dele.
  const nudge = position > current.position ? 0.5 : -0.5;
  return renumber(blocks.map((block) => (block.key === key ? { ...block, position: position + nudge } : block)));
}

export function updateBlock(blocks: EditorBlock[], key: string, changes: Partial<EditorBlock>): EditorBlock[] {
  return blocks.map((block) => (block.key === key ? { ...block, ...changes } : block));
}

/** Depois de salvar: cada bloco fica com o id que o backend deu a ele, pela posição. */
export function withSavedIds(blocks: EditorBlock[], saved: Schemas['SavedBlockDto'][]): EditorBlock[] {
  const ids = new Map(saved.map((block) => [block.position, block.id]));
  return blocks.map((block) => ({ ...block, id: ids.get(block.position) ?? block.id }));
}

export type IssueTarget = { blockKey?: string; field: string };

/** Para onde uma pendência aponta: `blocks[2].data.source` → o campo "source" do terceiro bloco. */
export function issueTarget(path: string, blocks: EditorBlock[]): IssueTarget {
  const block = /^blocks\[(\d+)\](?:\.data)?(?:\.(\w+))?/.exec(path);
  if (block) {
    return { blockKey: blocks[Number(block[1])]?.key, field: block[2] ?? '' };
  }
  if (path.startsWith('gradingNotes.')) {
    return { field: path.slice('gradingNotes.'.length) };
  }
  if (path.startsWith('sheet')) {
    return { field: path === 'sheet.maxLines' ? 'maxLines' : 'minLines' };
  }
  return { field: path };
}

/** "Texto 1 · imagem", "Enunciado", "Tipo, linhas e itens": o nome do cartão na barra dele. */
export function blockTitle(block: EditorBlock): string {
  switch (block.kind) {
    case 'collection_item': {
      const detail = block.format === 'verse' ? `verso, ${block.columns.length} ${block.columns.length === 1 ? 'coluna' : 'colunas'}` : FORMAT_LABEL[block.format].toLowerCase();
      return `${block.label || 'Texto'} · ${detail}`;
    }
    case 'command':
      return 'Enunciado';
    case 'instructions':
      return 'Tipo, linhas e itens';
    case 'heading':
      return block.title || 'Título de seção';
    case 'paragraph':
      return 'Parágrafo livre';
    default:
      return 'Linha separadora';
  }
}
