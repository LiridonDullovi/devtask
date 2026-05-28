import { MarkdownEditor } from "./MarkdownEditor";

interface MarkdownDescriptionFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  rows?: number;
  id?: string;
}

export function MarkdownDescriptionField({
  value,
  onChange,
  onBlur,
  placeholder,
  rows = 6,
  id,
}: MarkdownDescriptionFieldProps) {
  return (
    <MarkdownEditor
      id={id}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      placeholder={placeholder}
      minHeight={Math.max(120, rows * 22)}
    />
  );
}
