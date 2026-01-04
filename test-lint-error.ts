// This file demonstrates proper TypeScript code that passes lint checks

// Properly typed function with explicit return type
function greet(name: string): string {
  return `Hello, ${name}!`;
}

// Using the function to avoid unused variable warning
console.log(greet('World'));
