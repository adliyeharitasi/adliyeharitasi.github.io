import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const contacts = JSON.parse(
  fs.readFileSync(path.join(root, 'public/data/courthouse-contacts.json'), 'utf8'),
)
const queue = [...contacts.records]
const failures = []
let checked = 0

const worker = async () => {
  while (queue.length) {
    const contact = queue.shift()
    try {
      const response = await fetch(contact.contactUrl, {
        redirect: 'follow',
        signal: AbortSignal.timeout(12_000),
        headers: { 'user-agent': 'AdliyeHaritasi-LinkChecker/1.0' },
      })
      if (!response.ok) failures.push(`${contact.courthouseSeat}: HTTP ${response.status} — ${contact.contactUrl}`)
      await response.body?.cancel()
    } catch (error) {
      failures.push(`${contact.courthouseSeat}: ${error instanceof Error ? error.message : String(error)} — ${contact.contactUrl}`)
    }
    checked += 1
  }
}

await Promise.all(Array.from({ length: 12 }, worker))

if (failures.length) {
  console.error(failures.join('\n'))
  console.error(`${checked} bağlantı kontrol edildi; ${failures.length} bağlantı açılamadı.`)
  process.exit(1)
}

console.log(`${checked} doğrudan resmî iletişim bağlantısının tamamı açıldı.`)
