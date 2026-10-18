import type { ReactNode, SVGProps } from 'react'

export type IconName =
  | 'note'
  | 'note-filled'
  | 'rondel'
  | 'plus'
  | 'chevron-down'
  | 'chevron-right'
  | 'chevron-left'
  | 'gear'
  | 'calendar'
  | 'tag'
  | 'check'
  | 'close'
  | 'trash'
  | 'dots'
  | 'inbox'
  | 'sun'
  | 'layers'
  | 'arrow-right'
  | 'search'
  | 'grip'
  | 'repeat'
  | 'filter'
  | 'menu'
  | 'print'
  | 'flag'
  | 'flag-filled'

const PATHS: Record<IconName, ReactNode> = {
  note: <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5v6.7a1.5 1.5 0 0 1-.44 1.06l-3.3 3.3a1.5 1.5 0 0 1-1.06.44H5.5A1.5 1.5 0 0 1 4 15.5v-10Zm7.5 10.9V13a1 1 0 0 1 1-1h3.4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />,
  'note-filled': (
    <>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5v6.5l-4 4H5.5A1.5 1.5 0 0 1 4 14.5v-9Z" fill="currentColor" />
      <path d="M7 8h6M7 11h4" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  rondel: <path d="M15.5 6.5A5.5 5.5 0 1 0 16 10m0-3.5V4m0 2.5H13.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />,
  plus: <path d="M10 4.5v11M4.5 10h11" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />,
  'chevron-down': <path d="M5.5 8l4.5 4.5L14.5 8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />,
  'chevron-right': <path d="M8 5.5L12.5 10 8 14.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />,
  'chevron-left': <path d="M12 5.5L7.5 10 12 14.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />,
  gear: (
    <>
      <circle cx="10" cy="10" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 3.2v1.8M10 15v1.8M3.2 10H5m10 0h1.8M5.2 5.2l1.3 1.3m7 7 1.3 1.3m0-9.6-1.3 1.3m-7 7-1.3 1.3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="4.5" width="13" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.5 8h13M7 3.2v2.6M13 3.2v2.6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  tag: (
    <>
      <path d="M4 4.5h5.2a1.5 1.5 0 0 1 1.06.44l5.3 5.3a1.5 1.5 0 0 1 0 2.12l-3.7 3.7a1.5 1.5 0 0 1-2.12 0l-5.3-5.3A1.5 1.5 0 0 1 4 9.7V4.5Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="7.2" cy="7.2" r="1" fill="currentColor" />
    </>
  ),
  check: <path d="M4.5 10.5l3.5 3.5 7.5-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  close: <path d="M5.5 5.5l9 9m0-9-9 9" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />,
  trash: <path d="M5 6h10M8 6V4.7A1.2 1.2 0 0 1 9.2 3.5h1.6A1.2 1.2 0 0 1 12 4.7V6m1.5 0-.5 8.5A1.5 1.5 0 0 1 11.5 16h-3A1.5 1.5 0 0 1 7 14.5L6.5 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />,
  dots: (
    <>
      <circle cx="5" cy="10" r="1.4" fill="currentColor" />
      <circle cx="10" cy="10" r="1.4" fill="currentColor" />
      <circle cx="15" cy="10" r="1.4" fill="currentColor" />
    </>
  ),
  inbox: <path d="M4 10.5 5.6 5A1.5 1.5 0 0 1 7 4h6a1.5 1.5 0 0 1 1.4 1L16 10.5V14a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 4 14v-3.5Zm0 0h3.2a1 1 0 0 1 .95.68l.2.64a1 1 0 0 0 .95.68h1.4a1 1 0 0 0 .95-.68l.2-.64a1 1 0 0 1 .95-.68H16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />,
  sun: (
    <>
      <circle cx="10" cy="10" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 2.8v1.6M10 15.6v1.6M2.8 10h1.6m11.2 0h1.6M4.8 4.8l1.1 1.1m8.2 8.2 1.1 1.1m0-10.4-1.1 1.1m-8.2 8.2-1.1 1.1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  layers: <path d="M10 3.5 3.5 7 10 10.5 16.5 7 10 3.5Zm-6.5 6.5L10 13.5 16.5 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />,
  'arrow-right': <path d="M4.5 10h11m-4.5-4.5L15.5 10 11 14.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />,
  search: (
    <>
      <circle cx="9" cy="9" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12.5 12.5 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  grip: (
    <>
      <circle cx="7.5" cy="5" r="1.3" fill="currentColor" />
      <circle cx="12.5" cy="5" r="1.3" fill="currentColor" />
      <circle cx="7.5" cy="10" r="1.3" fill="currentColor" />
      <circle cx="12.5" cy="10" r="1.3" fill="currentColor" />
      <circle cx="7.5" cy="15" r="1.3" fill="currentColor" />
      <circle cx="12.5" cy="15" r="1.3" fill="currentColor" />
    </>
  ),
  repeat: (
    <path
      d="M6 7.5h6.5A3.5 3.5 0 0 1 16 11m-2 4.5H7.5A3.5 3.5 0 0 1 4 12m2-6.2L4 7.5 6 9.2m8 1.6 2 1.7-2 1.7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  flag: <path d="M5.5 16.5V4m0 .5h8.2a.5.5 0 0 1 .4.8L12.3 8l1.8 2.7a.5.5 0 0 1-.4.8H5.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />,
  'flag-filled': <path d="M5.5 16.5V4m0 .5h8.2a.5.5 0 0 1 .4.8L12.3 8l1.8 2.7a.5.5 0 0 1-.4.8H5.5" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />,
  print: (
    <path
      d="M6 8V3.5h8V8M6 14H4.5A1.5 1.5 0 0 1 3 12.5v-3A1.5 1.5 0 0 1 4.5 8h11A1.5 1.5 0 0 1 17 9.5v3a1.5 1.5 0 0 1-1.5 1.5H14M6 11.5h8v5H6v-5Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  ),
  menu: <path d="M4 6h12M4 10h12M4 14h12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />,
  filter: (
    <path
      d="M4 5.5h12l-4.6 5.4v3.3l-2.8 1.4V10.9L4 5.5Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
}

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName
  size?: number
}

export function Icon({ name, size = 20, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      role="img"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  )
}
