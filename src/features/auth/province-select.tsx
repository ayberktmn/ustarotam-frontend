"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactElement } from "react";
import { Popover } from "radix-ui";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { CatalogItem } from "@/lib/api/endpoints/catalog";

interface SearchableCatalogItem extends CatalogItem {
  value?: string;
}

export function filterCatalogItems(items: SearchableCatalogItem[], search: string): SearchableCatalogItem[] {
  const query = search.trim().toLocaleLowerCase("tr-TR");
  return items.filter((item) => item.name.toLocaleLowerCase("tr-TR").includes(query));
}

export const filterProvinces = filterCatalogItems;

export function SearchableCatalogSelect({ items, value, onChange, disabled = false, invalid = false,
  id, name, label, placeholder, searchLabel, clearSearchLabel, emptyLabel, describedBy, triggerClassName, avoidCollisions = false }: {
  items: SearchableCatalogItem[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  id: string;
  name: string;
  label: string;
  placeholder: string;
  searchLabel: string;
  clearSearchLabel: string;
  emptyLabel: string;
  describedBy?: string;
  triggerClassName?: string;
  avoidCollisions?: boolean;
}): ReactElement {
  const generatedId = useId();
  const listId = `${generatedId}-list`;
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const clear = useRef<HTMLButtonElement>(null);
  const tabTarget = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(0);
  const filtered = filterCatalogItems(items, search);
  const selected = items.find((item) => (item.value ?? item.id) === value);
  const activeId = filtered[active] ? `${generatedId}-${filtered[active].id}` : undefined;

  useEffect(() => {
    if (open && activeId) document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [open, activeId]);

  function changeOpen(next: boolean): void {
    setOpen(next);
    if (next) {
      setSearch("");
      setActive(Math.max(0, items.findIndex((item) => (item.value ?? item.id) === value)));
    }
  }

  function select(item: SearchableCatalogItem): void { onChange(item.value ?? item.id); setOpen(false); }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Tab") {
      event.preventDefault();
      event.stopPropagation();
      if (event.target === input.current && search && !event.shiftKey) { clear.current?.focus(); return; }
      if (event.target === clear.current && event.shiftKey) { input.current?.focus(); return; }
      const controls = Array.from(trigger.current?.closest("form")?.querySelectorAll<HTMLElement>(
        'input:not([type="hidden"]), button, select, textarea, a[href]',
      ) ?? []).filter((element) => !element.hasAttribute("disabled") && element.tabIndex >= 0);
      const index = controls.indexOf(trigger.current!);
      tabTarget.current = controls[index + (event.shiftKey ? -1 : 1)] ?? trigger.current;
      setOpen(false);
      return;
    }
    if (event.target !== input.current || event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => filtered.length ? (index + (event.key === "ArrowDown" ? 1 : -1) + filtered.length) % filtered.length : 0);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (filtered[active]) select(filtered[active]);
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={changeOpen}>
      <input type="hidden" name={name} value={value} />
      <Popover.Trigger asChild>
        <button ref={trigger} type="button" id={id} role="combobox"
          aria-label={label} aria-expanded={open} aria-haspopup="listbox"
          aria-controls={open ? listId : undefined} aria-invalid={invalid}
          aria-describedby={describedBy} disabled={disabled}
          onKeyDown={(event) => { if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); changeOpen(true); } }}
          className={cn("flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-line bg-card px-3.5 text-left text-sm shadow-xs outline-none transition-colors hover:border-brand focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive", triggerClassName)}>
          <span className={cn("truncate", selected ? "text-ink" : "text-muted-foreground")}>{selected?.name ?? placeholder}</span>
          <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-brand" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side="bottom" align="start" sideOffset={6} collisionPadding={8} avoidCollisions={avoidCollisions}
          aria-label={label} onKeyDownCapture={onKeyDown}
          onOpenAutoFocus={(event) => { event.preventDefault(); input.current?.focus(); }}
          onCloseAutoFocus={(event) => {
            if (tabTarget.current) { event.preventDefault(); tabTarget.current.focus(); tabTarget.current = null; }
          }}
          style={{ width: "var(--radix-popover-trigger-width)", height: "min(20rem, var(--radix-popover-content-available-height), calc(100vh - 1rem))", maxWidth: "calc(100vw - 1rem)" }}
          className="z-50 flex flex-col overflow-hidden rounded-xl border border-line bg-card p-1 shadow-card data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 motion-reduce:animate-none">
          <div className="relative shrink-0 border-b border-line p-2">
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input ref={input} role="combobox" type="text" autoComplete="off"
              aria-label={searchLabel} aria-expanded={open} aria-controls={listId}
              aria-autocomplete="list" aria-activedescendant={activeId}
              placeholder={searchLabel} value={search}
              onChange={(event) => { setSearch(event.target.value); setActive(0); }} className="pr-10 pl-9" />
            {search ? <button ref={clear} type="button" aria-label={clearSearchLabel}
              onClick={() => { setSearch(""); setActive(0); input.current?.focus(); }}
              className="absolute top-1/2 right-4 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-brand-soft hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/50">
              <X aria-hidden="true" className="size-4" />
            </button> : null}
          </div>
          <div id={listId} role="listbox" aria-label={label} className="min-h-0 overflow-y-auto overscroll-contain p-1 touch-pan-y">
            {filtered.map((item, index) => <button key={item.id} id={`${generatedId}-${item.id}`} type="button"
              role="option" aria-selected={value === (item.value ?? item.id)} tabIndex={-1}
              onPointerMove={() => setActive(index)} onMouseDown={(event) => event.preventDefault()} onClick={() => select(item)}
              className={cn("flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-sm outline-none", index === active ? "bg-brand-soft text-brand-deep" : "text-ink", value === (item.value ?? item.id) && "font-semibold")}>
              {item.name}{value === (item.value ?? item.id) ? <Check aria-hidden="true" className="size-4 text-brand" /> : null}
            </button>)}
          </div>
          {!filtered.length ? <p role="status" className="p-4 text-sm text-muted-foreground">{emptyLabel}</p> : null}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function ProvinceSelect({ items, value, onChange, disabled, invalid }: {
  items: CatalogItem[];
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  invalid: boolean;
}): ReactElement {
  const t = useTranslations("auth.register");
  return <SearchableCatalogSelect items={items} value={value} onChange={onChange}
    disabled={disabled} invalid={invalid} id="register-province" name="provinceId"
    label={t("province")} placeholder={t("provincePlaceholder")} searchLabel={t("provinceSearch")}
    clearSearchLabel={t("provinceClearSearch")} emptyLabel={t("provinceEmpty")}
    describedBy={invalid ? "register-province-error" : undefined} />;
}
