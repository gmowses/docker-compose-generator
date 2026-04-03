import { useState, useCallback, useEffect } from 'react'
import { Copy, Check, Plus, Trash2, Sun, Moon, Languages, Container, ChevronDown, ChevronUp } from 'lucide-react'

// ── i18n ─────────────────────────────────────────────────────────────────────
const translations = {
  en: {
    title: 'Docker Compose Generator',
    subtitle: 'Visually build docker-compose.yml files. Add services, ports, volumes, and env vars. Everything runs client-side.',
    addService: 'Add Service',
    services: 'Services',
    servicesDesc: 'Configure your Docker services',
    output: 'Output',
    outputDesc: 'Generated docker-compose.yml',
    serviceName: 'Service Name',
    image: 'Image',
    imagePlaceholder: 'e.g. nginx:latest',
    ports: 'Ports',
    addPort: 'Add Port',
    hostPort: 'Host',
    containerPort: 'Container',
    volumes: 'Volumes',
    addVolume: 'Add Volume',
    hostPath: 'Host Path',
    containerPath: 'Container Path',
    envVars: 'Environment Variables',
    addEnvVar: 'Add Variable',
    key: 'Key',
    value: 'Value',
    dependsOn: 'Depends On',
    dependsOnPlaceholder: 'e.g. db, redis (comma-separated)',
    restart: 'Restart Policy',
    copy: 'Copy',
    copied: 'Copied!',
    noServices: 'No services yet. Click "Add Service" to start.',
    removeService: 'Remove service',
    builtBy: 'Built by',
    restartNo: 'no',
    restartAlways: 'always',
    restartOnFailure: 'on-failure',
    restartUnlessStopped: 'unless-stopped',
    collapse: 'Collapse',
    expand: 'Expand',
    networks: 'Networks',
    addNetwork: 'Add Network',
  },
  pt: {
    title: 'Gerador de Docker Compose',
    subtitle: 'Construa arquivos docker-compose.yml visualmente. Adicione servicos, portas, volumes e variaveis. Tudo no navegador.',
    addService: 'Adicionar Servico',
    services: 'Servicos',
    servicesDesc: 'Configure seus servicos Docker',
    output: 'Saida',
    outputDesc: 'docker-compose.yml gerado',
    serviceName: 'Nome do Servico',
    image: 'Imagem',
    imagePlaceholder: 'ex: nginx:latest',
    ports: 'Portas',
    addPort: 'Adicionar Porta',
    hostPort: 'Host',
    containerPort: 'Container',
    volumes: 'Volumes',
    addVolume: 'Adicionar Volume',
    hostPath: 'Caminho Host',
    containerPath: 'Caminho Container',
    envVars: 'Variaveis de Ambiente',
    addEnvVar: 'Adicionar Variavel',
    key: 'Chave',
    value: 'Valor',
    dependsOn: 'Depende De',
    dependsOnPlaceholder: 'ex: db, redis (separados por virgula)',
    restart: 'Politica de Restart',
    copy: 'Copiar',
    copied: 'Copiado!',
    noServices: 'Nenhum servico ainda. Clique em "Adicionar Servico" para comecar.',
    removeService: 'Remover servico',
    builtBy: 'Criado por',
    restartNo: 'no',
    restartAlways: 'always',
    restartOnFailure: 'on-failure',
    restartUnlessStopped: 'unless-stopped',
    collapse: 'Recolher',
    expand: 'Expandir',
    networks: 'Redes',
    addNetwork: 'Adicionar Rede',
  },
} as const

type Lang = keyof typeof translations

// ── Types ─────────────────────────────────────────────────────────────────────
interface Port { id: string; host: string; container: string }
interface Volume { id: string; host: string; container: string }
interface EnvVar { id: string; key: string; value: string }
interface Network { id: string; name: string }

interface Service {
  id: string
  name: string
  image: string
  ports: Port[]
  volumes: Volume[]
  envVars: EnvVar[]
  dependsOn: string
  restart: string
  networks: Network[]
  collapsed: boolean
}

let uid = 0
const nextId = () => `id-${++uid}`

function makeService(): Service {
  return {
    id: nextId(),
    name: `service-${uid}`,
    image: '',
    ports: [],
    volumes: [],
    envVars: [],
    dependsOn: '',
    restart: 'no',
    networks: [],
    collapsed: false,
  }
}

// ── YAML generation ───────────────────────────────────────────────────────────
function indent(n: number) { return '  '.repeat(n) }

function generateYaml(services: Service[]): string {
  if (services.length === 0) return '# Add services to generate docker-compose.yml'

  const lines: string[] = ['services:']

  for (const svc of services) {
    const name = svc.name.trim() || 'service'
    lines.push(`${indent(1)}${name}:`)
    if (svc.image.trim()) lines.push(`${indent(2)}image: ${svc.image.trim()}`)

    const validPorts = svc.ports.filter(p => p.host.trim() && p.container.trim())
    if (validPorts.length > 0) {
      lines.push(`${indent(2)}ports:`)
      for (const p of validPorts) lines.push(`${indent(3)}- "${p.host.trim()}:${p.container.trim()}"`)
    }

    const validVolumes = svc.volumes.filter(v => v.host.trim() && v.container.trim())
    if (validVolumes.length > 0) {
      lines.push(`${indent(2)}volumes:`)
      for (const v of validVolumes) lines.push(`${indent(3)}- ${v.host.trim()}:${v.container.trim()}`)
    }

    const validEnv = svc.envVars.filter(e => e.key.trim())
    if (validEnv.length > 0) {
      lines.push(`${indent(2)}environment:`)
      for (const e of validEnv) {
        if (e.value.trim()) lines.push(`${indent(3)}- ${e.key.trim()}=${e.value.trim()}`)
        else lines.push(`${indent(3)}- ${e.key.trim()}`)
      }
    }

    const deps = svc.dependsOn.split(',').map(d => d.trim()).filter(Boolean)
    if (deps.length > 0) {
      lines.push(`${indent(2)}depends_on:`)
      for (const d of deps) lines.push(`${indent(3)}- ${d}`)
    }

    if (svc.restart && svc.restart !== 'no') lines.push(`${indent(2)}restart: ${svc.restart}`)

    const validNetworks = svc.networks.filter(n => n.name.trim())
    if (validNetworks.length > 0) {
      lines.push(`${indent(2)}networks:`)
      for (const n of validNetworks) lines.push(`${indent(3)}- ${n.name.trim()}`)
    }
  }

  // top-level networks section
  const allNetworks = new Set<string>()
  for (const svc of services) {
    for (const n of svc.networks) {
      if (n.name.trim()) allNetworks.add(n.name.trim())
    }
  }
  if (allNetworks.size > 0) {
    lines.push('')
    lines.push('networks:')
    for (const n of allNetworks) lines.push(`${indent(1)}${n}:`)
  }

  return lines.join('\n')
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function DockerComposeGenerator() {
  const [lang, setLang] = useState<Lang>(() => (navigator.language.startsWith('pt') ? 'pt' : 'en'))
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [services, setServices] = useState<Service[]>([])
  const [copied, setCopied] = useState(false)

  const t = translations[lang]

  useEffect(() => { document.documentElement.classList.toggle('dark', dark) }, [dark])

  const yaml = generateYaml(services)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(yaml).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [yaml])

  const addService = () => setServices(s => [...s, makeService()])

  const updateService = (id: string, patch: Partial<Service>) =>
    setServices(s => s.map(svc => svc.id === id ? { ...svc, ...patch } : svc))

  const removeService = (id: string) => setServices(s => s.filter(svc => svc.id !== id))

  const toggleCollapse = (id: string) =>
    setServices(s => s.map(svc => svc.id === id ? { ...svc, collapsed: !svc.collapsed } : svc))

  // Port helpers
  const addPort = (svcId: string) =>
    updateService(svcId, { ports: [...(services.find(s => s.id === svcId)?.ports ?? []), { id: nextId(), host: '', container: '' }] })
  const updatePort = (svcId: string, portId: string, field: 'host' | 'container', val: string) =>
    setServices(s => s.map(svc => svc.id === svcId ? { ...svc, ports: svc.ports.map(p => p.id === portId ? { ...p, [field]: val } : p) } : svc))
  const removePort = (svcId: string, portId: string) =>
    setServices(s => s.map(svc => svc.id === svcId ? { ...svc, ports: svc.ports.filter(p => p.id !== portId) } : svc))

  // Volume helpers
  const addVolume = (svcId: string) =>
    updateService(svcId, { volumes: [...(services.find(s => s.id === svcId)?.volumes ?? []), { id: nextId(), host: '', container: '' }] })
  const updateVolume = (svcId: string, volId: string, field: 'host' | 'container', val: string) =>
    setServices(s => s.map(svc => svc.id === svcId ? { ...svc, volumes: svc.volumes.map(v => v.id === volId ? { ...v, [field]: val } : v) } : svc))
  const removeVolume = (svcId: string, volId: string) =>
    setServices(s => s.map(svc => svc.id === svcId ? { ...svc, volumes: svc.volumes.filter(v => v.id !== volId) } : svc))

  // EnvVar helpers
  const addEnvVar = (svcId: string) =>
    updateService(svcId, { envVars: [...(services.find(s => s.id === svcId)?.envVars ?? []), { id: nextId(), key: '', value: '' }] })
  const updateEnvVar = (svcId: string, envId: string, field: 'key' | 'value', val: string) =>
    setServices(s => s.map(svc => svc.id === svcId ? { ...svc, envVars: svc.envVars.map(e => e.id === envId ? { ...e, [field]: val } : e) } : svc))
  const removeEnvVar = (svcId: string, envId: string) =>
    setServices(s => s.map(svc => svc.id === svcId ? { ...svc, envVars: svc.envVars.filter(e => e.id !== envId) } : svc))

  // Network helpers
  const addNetwork = (svcId: string) =>
    updateService(svcId, { networks: [...(services.find(s => s.id === svcId)?.networks ?? []), { id: nextId(), name: '' }] })
  const updateNetwork = (svcId: string, netId: string, val: string) =>
    setServices(s => s.map(svc => svc.id === svcId ? { ...svc, networks: svc.networks.map(n => n.id === netId ? { ...n, name: val } : n) } : svc))
  const removeNetwork = (svcId: string, netId: string) =>
    setServices(s => s.map(svc => svc.id === svcId ? { ...svc, networks: svc.networks.filter(n => n.id !== netId) } : svc))

  const inputCls = 'w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const btnSmCls = 'flex items-center gap-1 rounded-md border border-zinc-200 dark:border-zinc-700 px-2 py-1 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors'
  const iconBtnCls = 'p-1 rounded text-zinc-400 hover:text-red-500 transition-colors'

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Container size={18} className="text-white" />
            </div>
            <span className="font-semibold">Docker Compose Generator</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLang(l => l === 'en' ? 'pt' : 'en')} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <Languages size={14} />{lang.toUpperCase()}
            </button>
            <button onClick={() => setDark(d => !d)} className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <a href="https://github.com/gmowses/docker-compose-generator" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            </a>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-6 py-10">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">{t.title}</h1>
              <p className="mt-2 text-zinc-500 dark:text-zinc-400">{t.subtitle}</p>
            </div>
            <button onClick={addService} className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600 transition-colors shrink-0 mt-1">
              <Plus size={15} />{t.addService}
            </button>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {/* Left: services */}
            <div className="space-y-4">
              <div>
                <h2 className="font-semibold">{t.services}</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.servicesDesc}</p>
              </div>

              {services.length === 0 && (
                <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-10 text-center text-sm text-zinc-400">
                  {t.noServices}
                </div>
              )}

              {services.map(svc => (
                <div key={svc.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  {/* Service header */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    <span className="font-mono text-sm font-medium flex-1 truncate">{svc.name || 'unnamed'}</span>
                    <button onClick={() => toggleCollapse(svc.id)} className={btnSmCls} title={svc.collapsed ? t.expand : t.collapse}>
                      {svc.collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </button>
                    <button onClick={() => removeService(svc.id)} className="p-1 rounded text-zinc-400 hover:text-red-500 transition-colors" title={t.removeService}>
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {!svc.collapsed && (
                    <div className="p-4 space-y-4">
                      {/* Name + Image */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-zinc-500 mb-1">{t.serviceName}</label>
                          <input className={inputCls} value={svc.name} onChange={e => updateService(svc.id, { name: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-500 mb-1">{t.image}</label>
                          <input className={inputCls} placeholder={t.imagePlaceholder} value={svc.image} onChange={e => updateService(svc.id, { image: e.target.value })} />
                        </div>
                      </div>

                      {/* Restart */}
                      <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">{t.restart}</label>
                        <select className={inputCls} value={svc.restart} onChange={e => updateService(svc.id, { restart: e.target.value })}>
                          <option value="no">{t.restartNo}</option>
                          <option value="always">{t.restartAlways}</option>
                          <option value="on-failure">{t.restartOnFailure}</option>
                          <option value="unless-stopped">{t.restartUnlessStopped}</option>
                        </select>
                      </div>

                      {/* Ports */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-zinc-500">{t.ports}</label>
                          <button onClick={() => addPort(svc.id)} className={btnSmCls}><Plus size={12} />{t.addPort}</button>
                        </div>
                        {svc.ports.map(p => (
                          <div key={p.id} className="flex items-center gap-2">
                            <input className={inputCls} placeholder={t.hostPort} value={p.host} onChange={e => updatePort(svc.id, p.id, 'host', e.target.value)} />
                            <span className="text-zinc-400 text-sm shrink-0">:</span>
                            <input className={inputCls} placeholder={t.containerPort} value={p.container} onChange={e => updatePort(svc.id, p.id, 'container', e.target.value)} />
                            <button onClick={() => removePort(svc.id, p.id)} className={iconBtnCls}><Trash2 size={13} /></button>
                          </div>
                        ))}
                      </div>

                      {/* Volumes */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-zinc-500">{t.volumes}</label>
                          <button onClick={() => addVolume(svc.id)} className={btnSmCls}><Plus size={12} />{t.addVolume}</button>
                        </div>
                        {svc.volumes.map(v => (
                          <div key={v.id} className="flex items-center gap-2">
                            <input className={inputCls} placeholder={t.hostPath} value={v.host} onChange={e => updateVolume(svc.id, v.id, 'host', e.target.value)} />
                            <span className="text-zinc-400 text-sm shrink-0">:</span>
                            <input className={inputCls} placeholder={t.containerPath} value={v.container} onChange={e => updateVolume(svc.id, v.id, 'container', e.target.value)} />
                            <button onClick={() => removeVolume(svc.id, v.id)} className={iconBtnCls}><Trash2 size={13} /></button>
                          </div>
                        ))}
                      </div>

                      {/* Env vars */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-zinc-500">{t.envVars}</label>
                          <button onClick={() => addEnvVar(svc.id)} className={btnSmCls}><Plus size={12} />{t.addEnvVar}</button>
                        </div>
                        {svc.envVars.map(e => (
                          <div key={e.id} className="flex items-center gap-2">
                            <input className={inputCls} placeholder={t.key} value={e.key} onChange={ev => updateEnvVar(svc.id, e.id, 'key', ev.target.value)} />
                            <span className="text-zinc-400 text-sm shrink-0">=</span>
                            <input className={inputCls} placeholder={t.value} value={e.value} onChange={ev => updateEnvVar(svc.id, e.id, 'value', ev.target.value)} />
                            <button onClick={() => removeEnvVar(svc.id, e.id)} className={iconBtnCls}><Trash2 size={13} /></button>
                          </div>
                        ))}
                      </div>

                      {/* Networks */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-zinc-500">{t.networks}</label>
                          <button onClick={() => addNetwork(svc.id)} className={btnSmCls}><Plus size={12} />{t.addNetwork}</button>
                        </div>
                        {svc.networks.map(n => (
                          <div key={n.id} className="flex items-center gap-2">
                            <input className={inputCls} placeholder="network-name" value={n.name} onChange={e => updateNetwork(svc.id, n.id, e.target.value)} />
                            <button onClick={() => removeNetwork(svc.id, n.id)} className={iconBtnCls}><Trash2 size={13} /></button>
                          </div>
                        ))}
                      </div>

                      {/* Depends On */}
                      <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">{t.dependsOn}</label>
                        <input className={inputCls} placeholder={t.dependsOnPlaceholder} value={svc.dependsOn} onChange={e => updateService(svc.id, { dependsOn: e.target.value })} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Right: output */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <h2 className="font-semibold text-sm">{t.output}</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.outputDesc}</p>
                </div>
                <button onClick={handleCopy} className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                  {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                  {copied ? t.copied : t.copy}
                </button>
              </div>
              <pre className="flex-1 overflow-auto p-4 font-mono text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre">{yaml}</pre>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-zinc-400">
          <span>{t.builtBy} <a href="https://github.com/gmowses" className="text-zinc-600 dark:text-zinc-300 hover:text-blue-500 transition-colors">Gabriel Mowses</a></span>
          <span>MIT License</span>
        </div>
      </footer>
    </div>
  )
}
