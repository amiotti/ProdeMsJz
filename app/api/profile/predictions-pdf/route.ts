import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getSessionCookieName } from '@/lib/auth';
import { formatDateTimeArgentina } from '@/lib/datetime';
import { getPredictionsScreenState, getUserFromSessionToken } from '@/lib/db';

export const dynamic = 'force-dynamic';

function ascii(input: string) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pdfEscape(input: string) {
  return input.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function chunkLines(lines: string[], perPage: number) {
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += perPage) {
    pages.push(lines.slice(i, i + perPage));
  }
  return pages.length ? pages : [[]];
}

function buildSimplePdf(lines: string[]) {
  const pageWidth = 595;
  const pageHeight = 842;
  const left = 40;
  const top = 800;
  const lineHeight = 15;
  const linesPerPage = 48;
  const pages = chunkLines(lines, linesPerPage);

  const objects: string[] = [];
  const addObject = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  const fontObjId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const contentObjIds: number[] = [];
  const pageObjIds: number[] = [];

  for (const pageLines of pages) {
    const textOps = pageLines.map((line, idx) => {
      const y = top - idx * lineHeight;
      return `BT /F1 11 Tf 1 0 0 1 ${left} ${y} Tm (${pdfEscape(line)}) Tj ET`;
    });
    const stream = textOps.join('\n');
    const contentObjId = addObject(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`);
    contentObjIds.push(contentObjId);
    const pageObjId = addObject(
      `<< /Type /Page /Parent PAGES_REF /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontObjId} 0 R >> >> /Contents ${contentObjId} 0 R >>`,
    );
    pageObjIds.push(pageObjId);
  }

  const kids = pageObjIds.map((id) => `${id} 0 R`).join(' ');
  const pagesObjId = addObject(`<< /Type /Pages /Kids [${kids}] /Count ${pageObjIds.length} >>`);

  for (const pageId of pageObjIds) {
    objects[pageId - 1] = objects[pageId - 1].replace('PAGES_REF', `${pagesObjId} 0 R`);
  }

  const catalogObjId = addObject(`<< /Type /Catalog /Pages ${pagesObjId} 0 R >>`);

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  objects.forEach((obj, index) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${index + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogObjId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}

export async function GET() {
  try {
    const token = (await cookies()).get(getSessionCookieName())?.value ?? null;
    const user = await getUserFromSessionToken(token);
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Debes iniciar sesiÃ³n.' }, { status: 401 });
    }

    const state = await getPredictionsScreenState(token);
    const rows = state.db.predictions
      .filter((p) => p.userId === user.id)
      .map((p) => {
        const match = state.db.matches.find((m) => m.id === p.matchId);
        return match ? { prediction: p, match } : null;
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort((a, b) => new Date(a.match.kickoffAt).getTime() - new Date(b.match.kickoffAt).getTime());

    const headerLines = [
      'PRODE Mundial 2026 - Predicciones guardadas',
      `Usuario: ${ascii(`${user.firstName} ${user.lastName}`.trim() || user.name)}`,
      `Email: ${ascii(user.email)}`,
      `Generado: ${ascii(formatDateTimeArgentina(new Date().toISOString()))}`,
      `Cantidad de predicciones: ${rows.length}`,
      ' ',
    ];

    const bodyLines = rows.flatMap(({ prediction, match }, index) => {
      const official = match.officialResult ? `${match.officialResult.home} - ${match.officialResult.away}` : 'Pendiente';
      return [
        `${index + 1}. ${match.id} | ${ascii(formatDateTimeArgentina(match.kickoffAt))}`,
        `   ${ascii(match.homeTeam)} vs ${ascii(match.awayTeam)} | Pronostico: ${prediction.homeGoals} - ${prediction.awayGoals}`,
        `   Oficial: ${official}${match.venue ? ` | Sede: ${ascii(match.venue)}` : ''}`,
        ' ',
      ];
    });

    const pdfBuffer = buildSimplePdf([...headerLines, ...(bodyLines.length ? bodyLines : ['Sin predicciones guardadas.'])]);
    const fileName = `predicciones-${ascii((`${user.firstName}-${user.lastName}` || user.name).toLowerCase()).replace(/\s+/g, '-')}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo generar el PDF';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

