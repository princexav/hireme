export async function extractTextFromResume(file: File): Promise<string> {
  const type = file.type

  if (type === 'text/plain') {
    return file.text()
  }

  if (type === 'application/pdf') {
    const pdfParse = (await import('pdf-parse')).default
    const buffer = Buffer.from(await file.arrayBuffer())
    const data = await pdfParse(buffer)
    return data.text
  }

  if (
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    type === 'application/msword'
  ) {
    const mammoth = await import('mammoth')
    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  throw new Error(`Unsupported file type: ${type}`)
}
