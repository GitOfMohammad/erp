import { Children, isValidElement, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiCheck, FiChevronDown, FiSearch, FiX } from 'react-icons/fi'

export default function SearchableSelect({
  value,
  options = [],
  onChange,
  onSearch,
  onOpen,
  getOptionLabel,
  placeholder,
  emptyLabel = 'نتیجه‌ای پیدا نشد',
  loading = false,
  disabled = false,
  className = '',
  name,
  children,
  defaultValue = '',
  required = false,
  onBlur,
  ...inputProps
}) {
  const [text, setText] = useState('')
  const [internalValue, setInternalValue] = useState(defaultValue)
  const [editing, setEditing] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [menuPosition, setMenuPosition] = useState(null)
  const rootRef = useRef(null)
  const menuRef = useRef(null)
  const inputRef = useRef(null)
  const childLabel = (nodes) => Children.toArray(nodes).map((node) => {
    if (typeof node === 'string' || typeof node === 'number') return String(node)
    if (isValidElement(node)) return childLabel(node.props.children)
    return ''
  }).join('')
  const fromChildren = children !== undefined
  const childOptions = []
  if (fromChildren) Children.forEach(children, (node) => {
    if (!isValidElement(node)) return
    if (node.type === 'optgroup') {
      Children.forEach(node.props.children, (option) => {
        if (isValidElement(option) && option.type === 'option') childOptions.push({ id: option.props.value, label: childLabel(option.props.children), group: node.props.label, disabled: option.props.disabled })
      })
    } else if (node.type === 'option') childOptions.push({ id: node.props.value, label: childLabel(node.props.children), disabled: node.props.disabled })
  })
  const sourceOptions = fromChildren ? childOptions : options
  const effectivePlaceholder = placeholder || (fromChildren && childOptions.find((option) => option.id === '' || option.disabled)?.label) || 'برای جست‌وجو تایپ کنید…'
  const selectedValue = value === undefined ? internalValue : value
  const labelOf = getOptionLabel || ((option) => option?.label || option?.name || '')
  const selected = sourceOptions.find((option) => String(option.id ?? option.value) === String(selectedValue))
  const visibleOptions = sourceOptions.filter((option) => !option.disabled && (!editing || !text || `${labelOf(option)} ${option.group || ''}`.toLocaleLowerCase().includes(text.toLocaleLowerCase()))).slice(0, 20)

  useEffect(() => {
    if (editing) return
    if (selected) setText(labelOf(selected))
    else if (!selectedValue) setText('')
  }, [selectedValue, selected, editing])

  useEffect(() => {
    if (!editing || !onSearch) return undefined
    const timer = window.setTimeout(() => onSearch(text.trim()), 280)
    return () => window.clearTimeout(timer)
  }, [text, editing, onSearch])

  useEffect(() => {
    const closeOutside = (event) => {
      if (!rootRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) {
        setOpen(false)
        setEditing(false)
      }
    }
    document.addEventListener('mousedown', closeOutside)
    return () => document.removeEventListener('mousedown', closeOutside)
  }, [])

  useLayoutEffect(() => {
    if (!open || !inputRef.current) return undefined
    const updatePosition = () => {
      const rect = inputRef.current?.getBoundingClientRect()
      if (!rect) return
      const roomBelow = window.innerHeight - rect.bottom - 12
      const roomAbove = rect.top - 12
      const openAbove = roomBelow < 150 && roomAbove > roomBelow
      const height = Math.max(80, Math.min(220, openAbove ? roomAbove : roomBelow))
      setMenuPosition({
        left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
        right: 'auto',
        width: rect.width,
        top: openAbove ? Math.max(8, rect.top - height - 4) : rect.bottom + 4,
        maxHeight: height,
      })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  const choose = (option) => {
    setText(labelOf(option))
    setEditing(false)
    setOpen(false)
    const optionValue = option.id ?? option.value
    if (value === undefined) setInternalValue(optionValue)
    if (fromChildren) onChange?.({ target: { value: String(optionValue) }, currentTarget: { value: String(optionValue) } })
    else onChange?.(optionValue, option)
  }

  const clear = () => {
    setText('')
    setEditing(false)
    setOpen(true)
    setActiveIndex(0)
    if (value === undefined) setInternalValue('')
    if (fromChildren) onChange?.({ target: { value: '' }, currentTarget: { value: '' } })
    else onChange?.('', null)
    onSearch?.('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setOpen(false)
      setEditing(false)
      if (selected) setText(labelOf(selected))
      else setText('')
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((index) => Math.min(index + 1, Math.max(visibleOptions.length - 1, 0)))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
      return
    }
    if (event.key === 'Enter' && open && visibleOptions[activeIndex]) {
      event.preventDefault()
      choose(visibleOptions[activeIndex])
    }
  }

  const currentValue = selectedValue ?? ''
  return <div className={`searchable-select ${className}`} ref={rootRef}>
    {name && <input type="hidden" name={name} value={currentValue} disabled={disabled} readOnly/>}
    <div className="searchable-select-control">
      <FiSearch className="searchable-select-search-icon" aria-hidden="true"/>
      <input
        ref={inputRef}
        className="form-control searchable-select-input"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={`${name || 'search-select'}-options`}
        aria-activedescendant={open && visibleOptions[activeIndex] ? `${name || 'search-select'}-option-${activeIndex}` : undefined}
        placeholder={effectivePlaceholder}
        value={text}
        disabled={disabled}
        required={required && !currentValue}
        onInvalid={(event) => { if (!currentValue) event.currentTarget.setCustomValidity('لطفاً یک گزینه را از فهرست انتخاب کنید') }}
        onBlur={(event) => { event.currentTarget.setCustomValidity(''); onBlur?.(event) }}
        {...inputProps}
        onFocus={(event) => { setOpen(true); onOpen?.(); if (value && !editing) event.currentTarget.select() }}
        onClick={() => { setOpen(true); onOpen?.() }}
        onKeyDown={handleKeyDown}
        onChange={(event) => {
          setText(event.target.value)
          if (value === undefined) setInternalValue('')
          setEditing(true)
          setOpen(true)
          setActiveIndex(0)
        }}
      />
      {value ? <button type="button" className="searchable-select-clear" aria-label="پاک‌کردن انتخاب" onClick={clear}><FiX/></button> : <FiChevronDown className="searchable-select-chevron" aria-hidden="true"/>}
    </div>
    {open && menuPosition && createPortal(<div className="searchable-select-menu searchable-select-menu-fixed" ref={menuRef} style={menuPosition} id={`${name || 'search-select'}-options`} role="listbox">
      {loading ? <div className="searchable-select-message">در حال جست‌وجو…</div> : visibleOptions.length ? visibleOptions.map((option, index) => <button
        type="button"
        role="option"
        aria-selected={String(option.id ?? option.value) === String(currentValue)}
        id={`${name || 'search-select'}-option-${index}`}
        className={`searchable-select-option ${index === activeIndex ? 'is-active' : ''}`}
        key={option.id ?? option.value}
        onMouseEnter={() => setActiveIndex(index)}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => choose(option)}
      >{option.group && <small>{option.group} · </small>}{labelOf(option)}{String(option.id ?? option.value) === String(currentValue) && <FiCheck aria-hidden="true"/>}</button>) : <div className="searchable-select-message">{editing && text ? emptyLabel : 'برای دیدن گزینه‌ها تایپ کنید'}</div>}
    </div>, document.body)}
  </div>
}
