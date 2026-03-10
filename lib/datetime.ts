const ARG_TIME_ZONE = 'America/Argentina/Buenos_Aires';

const kickoffFormatter = new Intl.DateTimeFormat('es-AR', {
  timeZone: ARG_TIME_ZONE,
  day: 'numeric',
  month: 'numeric',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  timeZone: ARG_TIME_ZONE,
  day: 'numeric',
  month: 'numeric',
  year: '2-digit',
});

const dateTimeFormatter = new Intl.DateTimeFormat('es-AR', {
  timeZone: ARG_TIME_ZONE,
  day: 'numeric',
  month: 'numeric',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function formatKickoffArgentina(iso: string) {
  return `${kickoffFormatter.format(new Date(iso)).replace(',', '')} hs`;
}

export function formatDateArgentinaShort(iso: string) {
  return dateFormatter.format(new Date(iso));
}

export function formatDateTimeArgentina(iso: string) {
  return `${dateTimeFormatter.format(new Date(iso)).replace(',', '')} hs`;
}


