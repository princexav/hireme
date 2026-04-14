import { Document, Font, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { TailoredResumeJSON } from '@/lib/claude'

Font.registerHyphenationCallback((word) => [word])

Font.register({
  family: 'Roboto',
  fonts: [
    { src: '/fonts/Roboto-Regular.ttf', fontWeight: 'normal' },
    { src: '/fonts/Roboto-Bold.ttf', fontWeight: 'bold' },
  ],
})

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Roboto',
    fontSize: 10,
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 56,
    color: '#1a1a1a',
    lineHeight: 1.5,
  },
  sectionHeading: {
    fontFamily: 'Roboto',
    fontWeight: 'bold',
    fontSize: 11,
    marginTop: 10,
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#cccccc',
    paddingBottom: 2,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  jobTitle: {
    fontFamily: 'Roboto',
    fontWeight: 'bold',
    fontSize: 10,
  },
  jobMeta: {
    fontSize: 9,
    color: '#555555',
    marginBottom: 3,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 2,
    paddingLeft: 4,
  },
  bullet: {
    width: 12,
    fontSize: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
  },
  skillsText: {
    fontSize: 10,
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 10,
    marginBottom: 6,
    lineHeight: 1.6,
  },
  educationEntry: {
    marginBottom: 4,
  },
})

type Props = {
  text: string
  jobTitle?: string
}

export function ResumePDF({ text, jobTitle }: Props) {
  let data: TailoredResumeJSON | null = null
  try {
    data = JSON.parse(text) as TailoredResumeJSON
  } catch {
    // Fallback: render raw text if somehow an old Markdown string slips through
    const lines = text.split('\n')
    return (
      <Document title={jobTitle ? `Resume — ${jobTitle}` : 'Tailored Resume'} author="HireMe">
        <Page size="A4" style={styles.page}>
          {lines.map((line, i) => (
            <Text key={i} style={{ fontSize: 10, marginBottom: 2 }}>{line}</Text>
          ))}
        </Page>
      </Document>
    )
  }

  return (
    <Document title={jobTitle ? `Resume — ${jobTitle}` : 'Tailored Resume'} author="HireMe">
      <Page size="A4" style={styles.page}>

        {/* Summary */}
        {data.summary ? (
          <View>
            <Text style={styles.sectionHeading}>Summary</Text>
            <Text style={styles.summaryText}>{data.summary}</Text>
          </View>
        ) : null}

        {/* Skills */}
        {data.skills?.length > 0 ? (
          <View>
            <Text style={styles.sectionHeading}>Skills</Text>
            <Text style={styles.skillsText}>{data.skills.join(' • ')}</Text>
          </View>
        ) : null}

        {/* Certifications */}
        {data.certifications?.length > 0 ? (
          <View>
            <Text style={styles.sectionHeading}>Certifications</Text>
            <Text style={styles.skillsText}>{data.certifications.join(' • ')}</Text>
          </View>
        ) : null}

        {/* Experience */}
        {data.experience?.length > 0 ? (
          <View>
            <Text style={styles.sectionHeading}>Experience</Text>
            {data.experience.map((job, i) => (
              <View key={i} style={{ marginBottom: 8 }}>
                <View style={styles.jobHeader}>
                  <Text style={styles.jobTitle}>{job.title} — {job.company}</Text>
                  <Text style={{ fontSize: 9, color: '#555555' }}>{job.dates}</Text>
                </View>
                <Text style={styles.jobMeta}>{job.location}</Text>
                {job.bullets?.map((bullet, j) => (
                  <View key={j} style={styles.bulletRow}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {/* Education */}
        {data.education?.length > 0 ? (
          <View>
            <Text style={styles.sectionHeading}>Education</Text>
            {data.education.map((edu, i) => (
              <View key={i} style={styles.educationEntry}>
                <View style={styles.jobHeader}>
                  <Text style={styles.jobTitle}>{edu.degree}</Text>
                  <Text style={{ fontSize: 9, color: '#555555' }}>{edu.dates}</Text>
                </View>
                <Text style={styles.jobMeta}>{edu.institution}{edu.location ? ` — ${edu.location}` : ''}</Text>
              </View>
            ))}
          </View>
        ) : null}

      </Page>
    </Document>
  )
}
