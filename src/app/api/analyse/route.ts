import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  const { suburbData } = await req.json()

  if (!suburbData || !suburbData.name) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  }

  const prompt = `
You're a property investment analyst. Analyse the suburb below and return a concise summary and score.

Suburb:
- Name: ${suburbData.name}
- State: ${suburbData.state}
- LGA: ${suburbData.lga}
- Population: ${suburbData.population}
- Growth Rate: ${suburbData.growth_rate}
- Rental Yield: ${suburbData.rental_yield}
- Median Price: ${suburbData.median_price}

Please respond in this format:

Summary: <short paragraph>
Score: <number>/10
Recommendation: <text>
  `

  try {
    const chat = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
    })

    const response = chat.choices[0].message.content
    return NextResponse.json({ result: response })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'AI request failed' }, { status: 500 })
  }
}
