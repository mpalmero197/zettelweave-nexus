# End-to-End Encryption Implementation

## Overview

Baku Scribe now supports **per-item encryption** - users can choose which notes and cards to encrypt for maximum security while keeping other content searchable.

## How It Works

### Architecture

1. **Per-Item Encryption**: Each note/card has an independent encryption toggle
2. **AES-GCM Encryption**: Industry-standard 256-bit encryption via Web Crypto API
3. **Password-Based Key Derivation**: PBKDF2 with 100,000 iterations
4. **Zero-Knowledge**: Server never sees decrypted content or passwords

### User Flow

**First Time Setup:**
1. User toggles "High Security Mode" on a note/card
2. System prompts for encryption password (min. 12 chars)
3. Password strength indicator guides user
4. Salt is generated and stored in database
5. Item is encrypted client-side before upload

**Subsequent Usage:**
1. Toggle "High Security Mode" on any item
2. Enter encryption password
3. Item encrypted/decrypted instantly
4. Visual 🔒 indicator shows encrypted status

### Security Features

✅ **Client-Side Encryption**: All encryption/decryption happens in browser  
✅ **No Password Storage**: Password never sent to server  
✅ **Unique IVs**: Each encrypted item uses a random initialization vector  
✅ **Salt Per User**: Each user has a unique salt for key derivation  
✅ **Web Crypto API**: Uses browser's native cryptography (FIPS 140-2 compliant)

### Database Schema

**Encryption Fields Added:**

```sql
-- User preferences
user_preferences:
  - encryption_enabled: boolean
  - encryption_key_salt: text

-- Cards and Notes
zettel_cards / notes:
  - is_encrypted: boolean
  - encrypted_content: text
  - encryption_iv: text
```

**Storage Strategy:**
- Encrypted items: `encrypted_content` has encrypted blob, `content` is empty
- Regular items: `content` has plaintext, `encrypted_content` is null
- Metadata always unencrypted for filtering/display

### Trade-offs

**Encrypted Items:**
- ❌ No server-side search
- ❌ No AI analysis or embeddings
- ❌ No full-text content search
- ❌ Cannot share with other users
- ✅ Maximum privacy
- ✅ Protected from database breaches

**Regular Items:**
- ✅ Full search capabilities
- ✅ AI features work
- ✅ Embeddings and recommendations
- ✅ Can share with others
- ❌ Visible to database admins (in breaches)

### Best Practices

**For Users:**
1. Use strong, unique encryption passwords
2. Store password in password manager
3. Encrypt only truly sensitive content
4. Keep everyday knowledge base unencrypted for AI features
5. **CRITICAL**: No password recovery - lost password = lost data

**For Developers:**
1. Never log encryption passwords
2. Clear password from memory after use
3. Validate all crypto operations
4. Show clear warnings about data loss
5. Test encryption/decryption thoroughly

### Migration Path

**Encrypting Existing Content:**
1. User enables encryption in settings
2. Creates encryption password
3. Edits existing cards/notes
4. Toggles encryption on selected items
5. Content encrypted client-side on save

**Decrypting Content:**
1. Edit encrypted item
2. Toggle encryption off
3. Enter password to decrypt
4. Save as regular item

### Implementation Files

- `src/utils/encryption.ts` - Core encryption utilities
- `src/components/EncryptionToggle.tsx` - Toggle UI component
- `src/components/EncryptionPasswordDialog.tsx` - Password prompt
- `src/components/EncryptedBadge.tsx` - Visual indicator
- Database migration adds encryption columns

### Technical Specifications

**Encryption Algorithm:** AES-GCM-256  
**Key Derivation:** PBKDF2-SHA256 (100,000 iterations)  
**IV Length:** 96 bits (12 bytes)  
**Salt Length:** 128 bits (16 bytes)  
**Password Minimum:** 12 characters recommended  

### Future Enhancements

Potential improvements:
1. Bulk encryption/decryption tools
2. Key rotation utilities
3. Encrypted attachments
4. Client-side search index for encrypted items
5. Hardware key support (WebAuthn)
6. Encrypted export/import

## Security Considerations

### Threat Model

**Protected Against:**
- ✅ Database breaches
- ✅ Compromised admin accounts
- ✅ Server-side attacks
- ✅ Man-in-the-middle attacks (HTTPS)
- ✅ SQL injection (content is opaque blob)

**Not Protected Against:**
- ❌ Compromised user device
- ❌ Keyloggers on user machine
- ❌ User revealing password
- ❌ Weak user passwords
- ❌ Browser vulnerabilities

### Password Recovery

**⚠️ CRITICAL WARNING:**

There is **NO PASSWORD RECOVERY** mechanism. This is intentional:
- True end-to-end encryption means only user has the key
- Password recovery would require server-side key storage
- Server-side keys defeat the purpose of E2E encryption
- Lost password = permanently lost encrypted data

Users must:
1. Use password managers
2. Store password securely offline
3. Understand the risk before enabling
4. Only encrypt truly sensitive content

### Compliance

This implementation supports:
- GDPR "right to be forgotten" (delete encrypted data)
- HIPAA encryption requirements (AES-256)
- Zero-knowledge architecture
- User data portability (export encrypted blobs)

## Usage Examples

### Encrypt a Card

```typescript
import { encryptData, getUserEncryptionSalt } from '@/utils/encryption';

const salt = await getUserEncryptionSalt();
const password = getUserPassword(); // From secure prompt

const { encrypted, iv } = await encryptData(
  cardContent,
  password,
  salt
);

// Save to database
await supabase.from('zettel_cards').insert({
  title: cardTitle, // Unencrypted for display
  content: '', // Empty for encrypted items
  encrypted_content: encrypted,
  encryption_iv: iv,
  is_encrypted: true
});
```

### Decrypt a Card

```typescript
import { decryptData, getUserEncryptionSalt } from '@/utils/encryption';

const card = await fetchCard();
if (card.is_encrypted) {
  const salt = await getUserEncryptionSalt();
  const password = await promptUserForPassword();
  
  const decrypted = await decryptData(
    card.encrypted_content,
    card.encryption_iv,
    password,
    salt
  );
  
  displayContent(decrypted);
}
```

## Testing Checklist

- [ ] Password strength validation works
- [ ] Encrypt/decrypt round-trip successful
- [ ] Wrong password shows error
- [ ] Encrypted items display lock icon
- [ ] Search excludes encrypted content
- [ ] AI features disabled for encrypted items
- [ ] Multiple encrypted items with same password work
- [ ] Browser refresh retains encryption settings
- [ ] Network traffic contains only encrypted blobs
- [ ] Password dialog validates minimum length
