import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET() {
  try {
    console.log('Testing Gemini API...');
    
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      return NextResponse.json({ error: 'API key not found' }, { status: 500 });
    }
    
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const result = await model.generateContent("Say hello in a friendly way");
    const response = result.response;
    const text = response.text();
    
    return NextResponse.json({ 
      success: true, 
      response: text,
      apiKeyExists: !!process.env.GOOGLE_GEMINI_API_KEY,
      apiKeyLength: process.env.GOOGLE_GEMINI_API_KEY?.length
    });
    
  } catch (error) {
    console.error('Gemini test error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}