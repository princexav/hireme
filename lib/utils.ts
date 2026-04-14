import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type JobSource = {
  name: string
  type: 'ats' | 'aggregator' | 'unknown'
}

const ATS_DOMAINS: Record<string, string> = {
  'greenhouse.io': 'Greenhouse',
  'boards.greenhouse.io': 'Greenhouse',
  'job-boards.greenhouse.io': 'Greenhouse',
  'jobs.lever.co': 'Lever',
  'jobs.ashbyhq.com': 'Ashby',
  'app.ashbyhq.com': 'Ashby',
  'myworkdayjobs.com': 'Workday',
  'wd1.myworkdayjobs.com': 'Workday',
  'wd3.myworkdayjobs.com': 'Workday',
  'icims.com': 'iCIMS',
  'smartrecruiters.com': 'SmartRecruiters',
  'jobvite.com': 'Jobvite',
  'bamboohr.com': 'BambooHR',
  'taleo.net': 'Taleo',
  'jobs.gusto.com': 'Gusto',
  'rippling.com': 'Rippling',
  'workable.com': 'Workable',
  'recruitee.com': 'Recruitee',
}

const AGGREGATOR_DOMAINS: Record<string, string> = {
  'linkedin.com': 'LinkedIn',
  'indeed.com': 'Indeed',
  'ziprecruiter.com': 'ZipRecruiter',
  'glassdoor.com': 'Glassdoor',
  'dice.com': 'Dice',
  'monster.com': 'Monster',
  'careerbuilder.com': 'CareerBuilder',
  'simplyhired.com': 'SimplyHired',
  'wellfound.com': 'Wellfound',
  'angel.co': 'Wellfound',
  'builtinnyc.com': 'Built In',
  'builtinaustin.com': 'Built In',
  'builtinchicago.com': 'Built In',
  'builtin.com': 'Built In',
  'jsearch.p.rapidapi.com': 'JSearch',
}

export function formatRelativeTime(isoDate: string | null | undefined): string {
  if (!isoDate) return ''
  const diff = Date.now() - new Date(isoDate).getTime()
  if (isNaN(diff) || diff < 0) return ''
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'Just posted'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

export function detectJobSource(url: string): JobSource {
  let hostname: string
  try {
    hostname = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return { name: 'Unknown', type: 'unknown' }
  }

  if (ATS_DOMAINS[hostname]) {
    return { name: ATS_DOMAINS[hostname], type: 'ats' }
  }
  // partial match for subdomains (e.g. company.greenhouse.io, company.lever.co)
  for (const [domain, name] of Object.entries(ATS_DOMAINS)) {
    if (hostname.endsWith(`.${domain}`) || hostname === domain) {
      return { name, type: 'ats' }
    }
  }

  if (AGGREGATOR_DOMAINS[hostname]) {
    return { name: AGGREGATOR_DOMAINS[hostname], type: 'aggregator' }
  }
  for (const [domain, name] of Object.entries(AGGREGATOR_DOMAINS)) {
    if (hostname.endsWith(`.${domain}`) || hostname === domain) {
      return { name, type: 'aggregator' }
    }
  }

  return { name: 'Unknown', type: 'unknown' }
}
