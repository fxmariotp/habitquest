import { getDailyQuote } from '../lib/quotes'

export default function DayHeader({ lang }) {
  const now   = new Date()
  const quote = getDailyQuote(lang)

  const weekdays = {
    es: ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'],
    en: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
  }
  const months = {
    es: ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'],
    en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  }

  const day     = weekdays[lang]?.[now.getDay()] ?? weekdays.es[now.getDay()]
  const date    = now.getDate()
  const month   = months[lang]?.[now.getMonth()] ?? months.es[now.getMonth()]
  const dateStr = lang === 'en' ? `${day}, ${month} ${date}` : `${day}, ${date} de ${month}`

  return (
    <div style={{
      background: 'var(--panel)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r)',
      padding: '16px 18px',
      marginBottom: 14,
      boxShadow: 'var(--shadow)',
    }}>
      {/* Fecha */}
      <div style={{
        fontFamily: 'var(--mono)',
        fontSize: 12,
        letterSpacing: 1,
        color: 'var(--text3)',
        textTransform: 'uppercase',
        marginBottom: 6,
      }}>
        {dateStr}
      </div>

      {/* Frase */}
      <div style={{
        fontSize: 14,
        fontStyle: 'italic',
        color: 'var(--text2)',
        lineHeight: 1.5,
        marginBottom: 4,
      }}>
        "{quote.text}"
      </div>
      <div style={{
        fontSize: 11,
        color: 'var(--text3)',
        fontFamily: 'var(--mono)',
      }}>
        — {quote.author}
      </div>
    </div>
  )
}
