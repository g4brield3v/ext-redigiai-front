// Estado do editor de propostas (docs/07-propostas-de-redacao.md, A5): o que a tela mostra, como vira o JSON do
// cadastro e como as pendências da API apontam para os campos. Tudo aqui é função pura, sem tela.

import type { Schemas } from '../../lib/api';

export type BlockKind = 'collection_item' | 'card' | 'command' | 'instructions' | 'heading' | 'paragraph' | 'divider';
export type CollectionFormat = 'prose' | 'verse' | 'image';
export type CardItemFormat = 'text' | 'image';
/** Largura do texto da coletânea: dois de metade seguidos ficam lado a lado. */
export type CollectionWidth = 'full' | 'half';

/** Um dos 3 itens do card: texto ou imagem, com a legenda opcional. */
export type EditorCardItem = {
  format: CardItemFormat;
  body: string;
  assetId: string | null;
  imageUrl: string | null;
  alt: string;
  aiDescription: string;
  caption: string;
};

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
  /** Texto da coletânea: inteira ou metade da largura. */
  width: CollectionWidth;
  /** Texto da coletânea: o rótulo não aparece na página (a correção continua recebendo). */
  hideLabel: boolean;
  /** Texto da coletânea: notas de rodapé, uma por linha. */
  notes: string;
  /** Instruções e card: título. Título de seção: o texto dele. */
  title: string;
  /** Instruções: um item por linha. */
  items: string;
  /** Card: sempre 3 itens. */
  cardItems: EditorCardItem[];
};

export type EditorPrompt = {
  exam: string;
  slug: string;
  title: string;
  summary: string;
  sourceLabel: string;
  /** Categoria de correção: o nome dela é o tipo de redação. */
  essayType: string;
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
  card: 'Card',
  command: 'Comando',
  instructions: 'Instruções',
  heading: 'Título de seção',
  paragraph: 'Parágrafo',
  divider: 'Separador',
};

export const FORMAT_LABEL: Record<CollectionFormat, string> = { prose: 'Texto', verse: 'Verso', image: 'Imagem' };

export const CARD_FORMAT_LABEL: Record<CardItemFormat, string> = { text: 'Texto', image: 'Imagem' };

export const WIDTH_LABEL: Record<CollectionWidth, string> = { full: 'Inteira', half: 'Metade' };

export const MAX_COLUMNS = 4;

/** Um card tem exatamente 3 itens. */
export const CARD_ITEMS = 3;

let nextKey = 0;
const newKey = () => `b${++nextKey}`;

const lines = (text: string) => text.split('\n').map((line) => line.trim()).filter(Boolean);

const isKind = (kind: unknown): kind is BlockKind => typeof kind === 'string' && kind in KIND_LABEL;
const isFormat = (format: unknown): format is CollectionFormat => format === 'prose' || format === 'verse' || format === 'image';

export function emptyCardItem(): EditorCardItem {
  return { format: 'text', body: '', assetId: null, imageUrl: null, alt: '', aiDescription: '', caption: '' };
}

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
    width: 'full',
    hideLabel: false,
    notes: '',
    title: kind === 'instructions' ? 'Instruções' : '',
    items: '',
    cardItems: kind === 'card' ? Array.from({ length: CARD_ITEMS }, emptyCardItem) : [],
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

function cardItemFromApi(item: Schemas['PromptCardItemDto']): EditorCardItem {
  return {
    format: item.format === 'image' ? 'image' : 'text',
    body: item.body ?? '',
    assetId: item.assetId ?? null,
    imageUrl: item.imageUrl ?? null,
    alt: item.alt ?? '',
    aiDescription: item.aiDescription ?? '',
    caption: item.caption ?? '',
  };
}

export function fromApi(prompt: Schemas['PromptAdminDto']): EditorPrompt {
  const blocks = prompt.blocks.flatMap((block): EditorBlock[] => {
    if (!isKind(block.kind)) {
      return [];
    }
    const data = block.data ?? {};
    const cardItems = (data.cardItems ?? []).map(cardItemFromApi);
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
        width: data.width === 'half' ? 'half' : 'full',
        hideLabel: data.hideLabel === true,
        notes: (data.notes ?? []).join('\n'),
        title: (block.kind === 'heading' ? data.text : data.title) ?? (block.kind === 'instructions' ? 'Instruções' : ''),
        items: (data.items ?? []).join('\n'),
        // O backend só guarda card com 3 itens; se faltar algum, o editor completa para mostrar os 3 campos.
        cardItems: block.kind === 'card' ? [...cardItems, ...Array.from({ length: Math.max(0, CARD_ITEMS - cardItems.length) }, emptyCardItem)] : [],
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
    blocks: withInstructions([...blocks].sort((a, b) => a.position - b.position)),
    expectedFocus: notes.expectedFocus ?? '',
    tangentSignals: notes.tangentSignals ?? '',
    offTopicSignals: notes.offTopicSignals ?? '',
    keyData: (notes.keyData ?? []).join('\n'),
    extra: notes.extra ?? '',
  };
}

function cardItemData(item: EditorCardItem): Schemas['PromptCardItemDto'] {
  return item.format === 'image'
    ? { format: 'image', assetId: item.assetId, alt: item.alt, aiDescription: item.aiDescription, caption: item.caption }
    : { format: 'text', body: item.body, caption: item.caption };
}

function blockData(block: EditorBlock): Schemas['PromptBlockDataDto'] {
  switch (block.kind) {
    case 'collection_item': {
      // Largura, rótulo escondido e notas só vão quando fogem do padrão: o JSON exportado fica igual ao de antes.
      const notes = lines(block.notes);
      const common = {
        label: block.label,
        format: block.format,
        source: block.source,
        ...(block.width === 'half' ? { width: 'half' } : {}),
        ...(block.hideLabel ? { hideLabel: true } : {}),
        ...(notes.length ? { notes } : {}),
      };
      if (block.format === 'verse') {
        // Verso vazio no meio separa estrofes; os do fim da coluna são sobra de digitação.
        return { ...common, columns: block.columns.map((column) => column.replace(/\s+$/, '').split('\n')) };
      }
      return block.format === 'image'
        ? { ...common, assetId: block.assetId, alt: block.alt, aiDescription: block.aiDescription }
        : { ...common, body: block.body };
    }
    case 'card':
      return { title: block.title, cardItems: block.cardItems.map(cardItemData) };
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
    const cardItems = block.kind === 'card'
      ? block.cardItems.map((item) => ({
          format: item.format,
          body: item.format === 'text' ? item.body : undefined,
          imageUrl: item.format === 'image' ? item.imageUrl : undefined,
          alt: item.format === 'image' ? item.alt : undefined,
          caption: item.caption || undefined,
        }))
      : undefined;
    return {
      position: block.position,
      kind: block.kind,
      data: {
        ...data,
        title: data.title || undefined,
        cardItems,
        imageUrl: block.kind === 'collection_item' && block.format === 'image' ? block.imageUrl : undefined,
      },
    };
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

/** Muda um item do card, sem tocar nos outros dois. */
export function updateCardItem(block: EditorBlock, index: number, changes: Partial<EditorCardItem>): Partial<EditorBlock> {
  return { cardItems: block.cardItems.map((item, position) => (position === index ? { ...item, ...changes } : item)) };
}

/** Depois de salvar: cada bloco fica com o id que o backend deu a ele, pela posição. */
export function withSavedIds(blocks: EditorBlock[], saved: Schemas['SavedBlockDto'][]): EditorBlock[] {
  const ids = new Map(saved.map((block) => [block.position, block.id]));
  return blocks.map((block) => ({ ...block, id: ids.get(block.position) ?? block.id }));
}

export type IssueTarget = { blockKey?: string; field: string };

/**
 * Para onde uma pendência aponta: `blocks[2].data.source` → o campo "source" do terceiro bloco;
 * `blocks[6].data.cardItems[1].aiDescription` → o campo "cardItems[1].aiDescription" do sétimo.
 */
export function issueTarget(path: string, blocks: EditorBlock[]): IssueTarget {
  const block = /^blocks\[(\d+)\](?:\.data)?(?:\.([\w.[\]]+))?/.exec(path);
  if (block) {
    return { blockKey: blocks[Number(block[1])]?.key, field: block[2] ?? '' };
  }
  if (path.startsWith('gradingNotes.')) {
    return { field: path.slice('gradingNotes.'.length) };
  }
  return { field: path };
}

/** "Texto 1 · imagem", "Enunciado", "Tipo e itens": o nome do cartão na barra dele. */
export function blockTitle(block: EditorBlock): string {
  switch (block.kind) {
    case 'collection_item': {
      const detail = block.format === 'verse' ? `verso, ${block.columns.length} ${block.columns.length === 1 ? 'coluna' : 'colunas'}` : FORMAT_LABEL[block.format].toLowerCase();
      return `${block.label || 'Texto'} · ${detail}`;
    }
    case 'card':
      return 'Card com 3 blocos';
    case 'command':
      return 'Enunciado';
    case 'instructions':
      return 'Tipo e itens';
    case 'heading':
      return block.title || 'Título de seção';
    case 'paragraph':
      return 'Parágrafo livre';
    default:
      return 'Linha separadora';
  }
}
