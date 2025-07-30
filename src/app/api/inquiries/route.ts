// src/app/api/inquiries/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Ensure this is the correct path to your Firebase setup

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, productIds, message } = await req.json();

    // Validate the request body
    if (!name || !email || !phone || !productIds || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Add the inquiry to Firestore
    const inquiriesCollection = collection(db, 'inquiries');
    await addDoc(inquiriesCollection, {
      name,
      email,
      phone,
      productIds,
      message,
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({ message: 'Inquiry submitted successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error submitting inquiry:', error);
    return NextResponse.json({ error: 'Failed to submit inquiry' }, { status: 500 });
  }
}
