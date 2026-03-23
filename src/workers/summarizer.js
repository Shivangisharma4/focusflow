import { pipeline } from '@huggingface/transformers'

class SummarizationPipeline {
  static task = 'summarization'
  static model = 'Xenova/distilbart-cnn-6-6'
  static instance = null

  static async getInstance(progress_callback = null) {
    this.instance ??= pipeline(this.task, this.model, {
      progress_callback,
      dtype: 'q8', // quantized for faster download
    })
    return this.instance
  }
}

self.addEventListener('message', async (event) => {
  const { action, text, max_length = 150, min_length = 30 } = event.data

  // Preload: download model in background without generating
  if (action === 'preload') {
    try {
      await SummarizationPipeline.getInstance((x) => self.postMessage(x))
      self.postMessage({ status: 'ready' })
    } catch (err) {
      self.postMessage({ status: 'error', error: err.message })
    }
    return
  }

  try {
    const summarizer = await SummarizationPipeline.getInstance((x) => {
      self.postMessage(x)
    })

    const chunks = chunkText(text, 700)
    const summaries = []

    for (let i = 0; i < chunks.length; i++) {
      self.postMessage({ status: 'summarizing', chunk: i + 1, total: chunks.length })

      const result = await summarizer(chunks[i], {
        max_length: Math.max(40, Math.floor(max_length / chunks.length)),
        min_length: Math.min(min_length, 20),
      })

      summaries.push(result[0].summary_text)
    }

    self.postMessage({
      status: 'complete',
      output: summaries.join(' '),
    })
  } catch (err) {
    self.postMessage({ status: 'error', error: err.message })
  }
})

function chunkText(text, maxWords = 700) {
  const words = text.split(/\s+/)
  if (words.length <= maxWords) return [text]

  const chunks = []
  for (let i = 0; i < words.length; i += maxWords) {
    chunks.push(words.slice(i, i + maxWords).join(' '))
  }
  return chunks
}
