import { useMutation } from '@tanstack/react-query';
import { useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { errorMessage } from '../../lib/api';
import styles from './Admin.module.css';
import { uploadImage, useEssayTypes } from './adminApi';
import { CARD_FORMAT_LABEL, FORMAT_LABEL, KIND_LABEL, MAX_COLUMNS, blockTitle, updateCardItem } from './editorState';
import type { CardItemFormat, CollectionFormat, EditorBlock, EditorPrompt } from './editorState';

type FieldProps = {
  label: string;
  /** Nome do campo no JSON: é por ele que uma pendência encontra o campo. */
  name: string;
  hint?: ReactNode;
  children: (props: { id: string; 'data-field': string }) => ReactNode;
};

export function AdminField({ label, name, hint, children }: FieldProps) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      {children({ id, 'data-field': name })}
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}

type MarkdownProps = {
  label: string;
  name: string;
  value: string;
  disabled: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
};

/** Texto com os botões B e I, que envolvem a seleção nas marcações que o cadastro aceita. */
export function MarkdownArea({ label, name, value, disabled, placeholder, onChange }: MarkdownProps) {
  const id = useId();
  const area = useRef<HTMLTextAreaElement>(null);

  function wrap(mark: string) {
    const element = area.current;
    if (!element) {
      return;
    }
    const { selectionStart: start, selectionEnd: end } = element;
    onChange(`${value.slice(0, start)}${mark}${value.slice(start, end)}${mark}${value.slice(end)}`);
    // Depois que o texto novo chega à tela, a seleção volta para dentro das marcas.
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(start + mark.length, end + mark.length);
    });
  }

  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <div>
        {!disabled && (
          <div className={styles.toolbar}>
            <button type="button" aria-label="Negrito" onClick={() => wrap('**')}>
              <b>B</b>
            </button>
            <button type="button" aria-label="Itálico" onClick={() => wrap('*')}>
              <i>I</i>
            </button>
          </div>
        )}
        <textarea
          ref={area}
          id={id}
          data-field={name}
          className={disabled ? styles.textarea : `${styles.textarea} ${styles.withToolbar}`}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}

type CardProps = {
  block: EditorBlock;
  prompt: EditorPrompt;
  readOnly: boolean;
  first: boolean;
  last: boolean;
  /** Pendências deste bloco, para o aviso no pé do cartão. */
  issues: string[];
  dragging: boolean;
  onChange: (changes: Partial<EditorBlock>) => void;
  onPromptChange: (changes: Partial<EditorPrompt>) => void;
  onMove: (direction: -1 | 1) => void;
  onPosition: (position: number) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDropHere: () => void;
};

type ImageUploadProps = {
  /** Nome acessível do campo de arquivo ("Imagem do Texto 1"). */
  label: string;
  /** Campo da pendência de arquivo que falta (`assetId`, `cardItems[1].assetId`). */
  field: string;
  imageUrl: string | null;
  readOnly: boolean;
  onUploaded: (image: { assetId: string; imageUrl: string }) => void;
};

/** A miniatura que abre a escolha do arquivo e envia a imagem para a pasta pública das propostas. */
function ImageUpload({ label, field, imageUrl, readOnly, onUploaded }: ImageUploadProps) {
  const file = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const upload = useMutation({
    mutationFn: uploadImage,
    onSuccess: (image) => onUploaded({ assetId: image.assetId, imageUrl: image.url }),
  });

  return (
    <div className={styles.field}>
      <input
        ref={file}
        className="visually-hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label={label}
        data-field={field}
        disabled={readOnly}
        onChange={(event) => {
          const chosen = event.target.files?.[0];
          event.target.value = '';
          if (chosen) {
            setFileName(chosen.name);
            upload.mutate(chosen);
          }
        }}
      />
      <button type="button" className={styles.thumb} disabled={readOnly} onClick={() => file.current?.click()}>
        {upload.isPending ? 'Enviando…' : imageUrl ? <img src={imageUrl} alt="" /> : (fileName ?? 'Enviar imagem')}
      </button>
      {upload.error && (
        <span className={styles.errorText} role="alert">
          {errorMessage(upload.error)}
        </span>
      )}
    </div>
  );
}

function ImageFields({ block, readOnly, onChange }: Pick<CardProps, 'block' | 'readOnly' | 'onChange'>) {
  return (
    <>
      <div className={styles.imageRow}>
        <ImageUpload
          label={`Imagem do ${block.label || 'texto'}`}
          field="assetId"
          imageUrl={block.imageUrl}
          readOnly={readOnly}
          onUploaded={(image) => onChange(image)}
        />
        <AdminField label="Rótulo" name="label">
          {(props) => <input {...props} className={styles.input} value={block.label} disabled={readOnly} onChange={(event) => onChange({ label: event.target.value })} />}
        </AdminField>
        <AdminField label="Fonte" name="source">
          {(props) => <input {...props} className={styles.input} value={block.source} disabled={readOnly} onChange={(event) => onChange({ source: event.target.value })} />}
        </AdminField>
      </div>
      <AdminField label="Texto alternativo (para leitores de tela)" name="alt">
        {(props) => (
          <input {...props} className={styles.input} value={block.alt} disabled={readOnly} placeholder="Descreva a imagem em uma frase" onChange={(event) => onChange({ alt: event.target.value })} />
        )}
      </AdminField>
      <AdminField label="Descrição para a IA" name="aiDescription" hint="A correção só recebe texto: sem esta descrição, a IA não sabe o que a imagem diz.">
        {(props) => (
          <textarea
            {...props}
            className={styles.textarea}
            value={block.aiDescription}
            disabled={readOnly}
            placeholder="Descreva os quadros e transcreva as falas, em ordem."
            onChange={(event) => onChange({ aiDescription: event.target.value })}
          />
        )}
      </AdminField>
    </>
  );
}

function CollectionFields({ block, readOnly, onChange }: Pick<CardProps, 'block' | 'readOnly' | 'onChange'>) {
  const format = (
    <div className={styles.field}>
      <span className={styles.fieldLabel} id={`formato-${block.key}`}>
        Formato
      </span>
      <div className={styles.segmented} role="radiogroup" aria-labelledby={`formato-${block.key}`}>
        {(Object.keys(FORMAT_LABEL) as CollectionFormat[]).map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={block.format === option}
            data-field={option === block.format ? 'format' : undefined}
            disabled={readOnly}
            onClick={() => onChange({ format: option })}
          >
            {FORMAT_LABEL[option]}
          </button>
        ))}
      </div>
    </div>
  );

  if (block.format === 'image') {
    return (
      <>
        {format}
        <ImageFields block={block} readOnly={readOnly} onChange={onChange} />
      </>
    );
  }

  const labelField = (
    <AdminField label="Rótulo" name="label">
      {(props) => <input {...props} className={styles.input} value={block.label} disabled={readOnly} onChange={(event) => onChange({ label: event.target.value })} />}
    </AdminField>
  );
  const source = (
    <AdminField label="Fonte" name="source">
      {(props) => <input {...props} className={styles.input} value={block.source} disabled={readOnly} onChange={(event) => onChange({ source: event.target.value })} />}
    </AdminField>
  );

  return (
    <>
      <div className={styles.columns2}>
        {labelField}
        {format}
      </div>
      {block.format === 'verse' ? (
        <>
          <div className={styles.columns3}>
            {block.columns.map((column, index) => (
              <AdminField key={index} label={`Coluna ${index + 1}`} name={index === 0 ? 'columns' : `columns${index}`}>
                {(props) => (
                  <textarea
                    {...props}
                    className={styles.textarea}
                    value={column}
                    disabled={readOnly}
                    placeholder="Versos, um por linha"
                    onChange={(event) => onChange({ columns: block.columns.map((text, position) => (position === index ? event.target.value : text)) })}
                  />
                )}
              </AdminField>
            ))}
          </div>
          {!readOnly && (
            <div className={styles.addRow}>
              {block.columns.length < MAX_COLUMNS && (
                <button type="button" onClick={() => onChange({ columns: [...block.columns, ''] })}>
                  + Coluna
                </button>
              )}
              {block.columns.length > 1 && (
                <button type="button" onClick={() => onChange({ columns: block.columns.slice(0, -1) })}>
                  Remover a última coluna
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <MarkdownArea label="Texto" name="body" value={block.body} disabled={readOnly} onChange={(body) => onChange({ body })} />
      )}
      {source}
    </>
  );
}

function InstructionsFields({ block, prompt, readOnly, onChange, onPromptChange }: Pick<CardProps, 'block' | 'prompt' | 'readOnly' | 'onChange' | 'onPromptChange'>) {
  const types = useEssayTypes(prompt.exam);
  // Enquanto a lista não chega (ou se falhou), a categoria salva continua aparecendo selecionada.
  const options = types.data ?? (prompt.essayType ? [{ slug: prompt.essayType, name: prompt.essayType, hasActiveProfile: true }] : []);

  return (
    <>
      <AdminField label="Título da seção" name="title">
        {(props) => <input {...props} className={styles.input} value={block.title} disabled={readOnly} onChange={(event) => onChange({ title: event.target.value })} />}
      </AdminField>
      <AdminField
        label="Categoria de correção"
        name="essayType"
        hint="Define o tipo de redação e o perfil de correção. O aluno vê o nome da categoria como primeiro item das instruções."
      >
        {(props) => (
          <select {...props} className={styles.input} value={prompt.essayType} disabled={readOnly} onChange={(event) => onPromptChange({ essayType: event.target.value })}>
            <option value="">Escolha</option>
            {options.map((type) => (
              <option key={type.slug} value={type.slug}>
                {type.hasActiveProfile ? type.name : `${type.name} (sem perfil de correção ativo)`}
              </option>
            ))}
          </select>
        )}
      </AdminField>
      {types.error && (
        <span className={styles.errorText} role="alert">
          {errorMessage(types.error)}
        </span>
      )}
      <AdminField label="Itens (um por linha)" name="items" hint="Escreva aqui as regras da prova, como número de linhas e título. A IA lê estes itens.">
        {(props) => <textarea {...props} className={styles.textarea} value={block.items} disabled={readOnly} onChange={(event) => onChange({ items: event.target.value })} />}
      </AdminField>
    </>
  );
}

/** Card com 3 blocos: título opcional e, para cada bloco, texto ou imagem, mais a legenda opcional. */
function CardFields({ block, readOnly, onChange }: Pick<CardProps, 'block' | 'readOnly' | 'onChange'>) {
  return (
    <>
      <p className={`${styles.hint} ${styles.cardHint}`}>
        Três blocos empilhados na vertical, dentro de um mesmo card. Cada bloco pode ser texto ou imagem.
      </p>
      <AdminField label="Título do card (opcional)" name="title">
        {(props) => (
          <input {...props} className={styles.input} value={block.title} disabled={readOnly} placeholder="Ex.: Para refletir" onChange={(event) => onChange({ title: event.target.value })} />
        )}
      </AdminField>
      {block.cardItems.map((item, index) => {
        const field = `cardItems[${index}]`;
        const change = (changes: Parameters<typeof updateCardItem>[2]) => onChange(updateCardItem(block, index, changes));
        const groupId = `card-${block.key}-${index}`;
        return (
          <div key={index} className={styles.cardItem}>
            <div className={styles.cardItemHead}>
              <span className={styles.cardNumber} aria-hidden="true">
                {index + 1}
              </span>
              <strong id={groupId}>Bloco {index + 1}</strong>
              <div className={styles.segmented} role="radiogroup" aria-labelledby={groupId}>
                {(Object.keys(CARD_FORMAT_LABEL) as CardItemFormat[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={item.format === option}
                    data-field={option === item.format ? `${field}.format` : undefined}
                    disabled={readOnly}
                    onClick={() => change({ format: option })}
                  >
                    {CARD_FORMAT_LABEL[option]}
                  </button>
                ))}
              </div>
            </div>
            {item.format === 'image' ? (
              <div className={styles.cardImageRow}>
                <ImageUpload
                  label={`Imagem do bloco ${index + 1}`}
                  field={`${field}.assetId`}
                  imageUrl={item.imageUrl}
                  readOnly={readOnly}
                  onUploaded={(image) => change(image)}
                />
                <div className={styles.cardImageFields}>
                  <AdminField label="Texto alternativo" name={`${field}.alt`}>
                    {(props) => (
                      <input {...props} className={styles.input} value={item.alt} disabled={readOnly} placeholder="Descreva a imagem em uma frase" onChange={(event) => change({ alt: event.target.value })} />
                    )}
                  </AdminField>
                  <AdminField label="Descrição para a IA" name={`${field}.aiDescription`}>
                    {(props) => (
                      <textarea
                        {...props}
                        className={styles.textarea}
                        value={item.aiDescription}
                        disabled={readOnly}
                        placeholder="Descreva tudo o que a imagem mostra, com as falas transcritas"
                        onChange={(event) => change({ aiDescription: event.target.value })}
                      />
                    )}
                  </AdminField>
                </div>
              </div>
            ) : (
              <MarkdownArea label="Texto" name={`${field}.body`} value={item.body} disabled={readOnly} onChange={(body) => change({ body })} />
            )}
            <AdminField label="Legenda ou fonte (opcional)" name={`${field}.caption`}>
              {(props) => (
                <input {...props} className={styles.input} value={item.caption} disabled={readOnly} placeholder="Ex.: Fonte: IBGE, 2024." onChange={(event) => change({ caption: event.target.value })} />
              )}
            </AdminField>
          </div>
        );
      })}
    </>
  );
}

/** Um bloco da página no editor: a barra com posição, ordem, duplicar e remover, e os campos do tipo dele. */
export function BlockCard(props: CardProps) {
  const { block, prompt, readOnly, first, last, issues, dragging, onChange, onPromptChange } = props;
  // Enquanto se digita, vale o que está no campo; fora disso, a posição do bloco, que muda também pelas setas,
  // pelo arrasto e pela renumeração.
  const [typing, setTyping] = useState<string | null>(null);
  const position = typing ?? String(block.position);
  const [armed, setArmed] = useState(false);
  const fixed = block.kind === 'instructions';

  const commit = () => {
    const typed = Number(position);
    setTyping(null);
    if (position.trim() !== '' && Number.isInteger(typed) && typed >= 0 && typed !== block.position) {
      props.onPosition(typed);
    }
  };

  return (
    <div
      id={`bloco-${block.key}`}
      className={[styles.block, issues.length > 0 && styles.blockError, dragging && styles.blockDragging].filter(Boolean).join(' ')}
      draggable={armed && !readOnly}
      onDragStart={props.onDragStart}
      onDragEnd={() => {
        setArmed(false);
        props.onDragEnd();
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        props.onDropHere();
      }}
    >
      <div className={styles.blockHead}>
        {/* Só a alça arma o arrasto: assim selecionar texto dentro do cartão não o move. */}
        <span className={styles.grip} aria-hidden="true" onMouseDown={() => setArmed(true)} onMouseUp={() => setArmed(false)}>
          ⠿
        </span>
        <label className={styles.positionLabel}>
          Posição
          <input
            className={styles.position}
            inputMode="numeric"
            aria-label={`Posição de ${blockTitle(block)}`}
            value={position}
            disabled={readOnly}
            onChange={(event) => setTyping(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                commit();
              }
            }}
          />
        </label>
        <span className={styles.kind}>{KIND_LABEL[block.kind]}</span>
        <span className={styles.blockName}>{blockTitle(block)}</span>
        {!readOnly && (
          <>
            <button type="button" className={styles.iconButton} aria-label={`Subir ${blockTitle(block)}`} disabled={first} onClick={() => props.onMove(-1)}>
              ↑
            </button>
            <button type="button" className={styles.iconButton} aria-label={`Descer ${blockTitle(block)}`} disabled={last} onClick={() => props.onMove(1)}>
              ↓
            </button>
            <button type="button" className={styles.iconButton} aria-label={`Duplicar ${blockTitle(block)}`} disabled={fixed} onClick={props.onDuplicate}>
              ⧉
            </button>
            <button type="button" className={`${styles.iconButton} ${styles.remove}`} aria-label={`Remover ${blockTitle(block)}`} disabled={fixed} onClick={props.onRemove}>
              ✕
            </button>
          </>
        )}
      </div>
      {block.kind !== 'divider' && (
        <div className={styles.blockBody}>
          {block.kind === 'collection_item' && <CollectionFields block={block} readOnly={readOnly} onChange={onChange} />}
          {block.kind === 'card' && <CardFields block={block} readOnly={readOnly} onChange={onChange} />}
          {block.kind === 'command' && <MarkdownArea label="Enunciado" name="body" value={block.body} disabled={readOnly} onChange={(body) => onChange({ body })} />}
          {block.kind === 'paragraph' && <MarkdownArea label="Parágrafo" name="body" value={block.body} disabled={readOnly} onChange={(body) => onChange({ body })} />}
          {block.kind === 'heading' && (
            <AdminField label="Título da seção" name="text">
              {(field) => <input {...field} className={styles.input} value={block.title} disabled={readOnly} onChange={(event) => onChange({ title: event.target.value })} />}
            </AdminField>
          )}
          {block.kind === 'instructions' && (
            <InstructionsFields block={block} prompt={prompt} readOnly={readOnly} onChange={onChange} onPromptChange={onPromptChange} />
          )}
          {issues.map((issue) => (
            <span key={issue} className={styles.errorText}>
              ⚠ {issue}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
