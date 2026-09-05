// Resizes the hand-made app icon (scripts/icon-source.png) into PWA sizes.
// Run: node scripts/icons.mjs
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

mkdirSync('public/icons', { recursive: true })
await sharp('scripts/icon-source.png').resize(512, 512).png().toFile('public/icons/icon-512.png')
await sharp('scripts/icon-source.png').resize(192, 192).png().toFile('public/icons/icon-192.png')
console.log('icons written')
