import { NumericFormat } from 'react-number-format'

export default function FormattedNumberInput({
  value,
  onValueChange,
  decimalScale = 3,
  grouping = true,
  ...props
}) {
  const valueProps = value === undefined ? {} : { value: value ?? '' }
  return <NumericFormat
    {...props}
    {...valueProps}
    type="text"
    inputMode="decimal"
    thousandSeparator={grouping ? ',' : false}
    decimalScale={decimalScale}
    allowNegative={false}
    onValueChange={({ value: numericValue }) => onValueChange?.(numericValue)}
  />
}
