// User registration endpoint (public)
import { NextRequest, NextResponse } from 'next/server';
import { getTokenByValue, isTokenValid, markTokenAsUsed } from '@/lib/tokens';
import { createUser, queryUser } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { validateEmail, validatePassword } from '@/lib/validation';
import type { RegisterUserRequest, RegisterUserResponse } from '@/types/registration';

/**
 * POST /api/auth/register
 * Register a new user with a valid token
 */
export async function POST(request: NextRequest) {
  try {
    const body: RegisterUserRequest = await request.json();
    const { token: tokenValue, email, password } = body;

    // Validate input
    if (!tokenValue || !email || !password) {
      return NextResponse.json(
        { error: 'Token, email, and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.errors.join(', ') },
        { status: 400 }
      );
    }

    // Look up token
    const token = await getTokenByValue(tokenValue);
    if (!token) {
      return NextResponse.json(
        { error: 'Invalid registration token' },
        { status: 400 }
      );
    }

    // Validate token (not used, not expired)
    if (!isTokenValid(token)) {
      if (token.used) {
        return NextResponse.json(
          { error: 'Registration token has already been used' },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          { error: 'Registration token has expired' },
          { status: 400 }
        );
      }
    }

    // Check if email already exists
    const existingUser = await queryUser(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await createUser(email, passwordHash, 'user');

    // Mark token as used
    await markTokenAsUsed(tokenValue, user.id);

    // Return success response (do NOT auto-login)
    const response: RegisterUserResponse = {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}
