-- Seed RSS Sources from rss.md
-- This script inserts all RSS feed sources into the source_configurations table
-- Run with: psql -h localhost -U postgres -d crypto_knowledge_dev -f seed-rss-sources.sql

-- Note: CoinTelegraph and CoinDesk are already in the config files, so we skip them

-- 1. Bitcoinist
INSERT INTO source_configurations (
  source_id, source_type, name, config, encrypted_credentials, is_active, version, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'RSS',
  'Bitcoinist',
  '{"feedUrl": "https://bitcoinist.com/feed", "updateInterval": 3600, "categories": ["bitcoin", "blockchain", "news"], "language": "en", "maxItems": 50, "timeout": 30000}'::jsonb,
  NULL,
  true,
  0,
  NOW(),
  NOW()
);

-- 2. NewsBTC
INSERT INTO source_configurations (
  source_id, source_type, name, config, encrypted_credentials, is_active, version, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'RSS',
  'NewsBTC',
  '{"feedUrl": "https://newsbtc.com/feed", "updateInterval": 3600, "categories": ["bitcoin", "altcoin", "mining", "analysis"], "language": "en", "maxItems": 50, "timeout": 30000}'::jsonb,
  NULL,
  true,
  0,
  NOW(),
  NOW()
);

-- 3. CryptoPotato
INSERT INTO source_configurations (
  source_id, source_type, name, config, encrypted_credentials, is_active, version, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'RSS',
  'CryptoPotato',
  '{"feedUrl": "https://cryptopotato.com/feed", "updateInterval": 3600, "categories": ["bitcoin", "crypto", "news", "analysis", "guides"], "language": "en", "maxItems": 50, "timeout": 30000}'::jsonb,
  NULL,
  true,
  0,
  NOW(),
  NOW()
);

-- 4. 99bitcoins
INSERT INTO source_configurations (
  source_id, source_type, name, config, encrypted_credentials, is_active, version, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'RSS',
  '99Bitcoins',
  '{"feedUrl": "https://99bitcoins.com/feed", "updateInterval": 3600, "categories": ["bitcoin", "tutorials", "wallets", "mining"], "language": "en", "maxItems": 50, "timeout": 30000}'::jsonb,
  NULL,
  true,
  0,
  NOW(),
  NOW()
);

-- 5. Cryptobriefing
INSERT INTO source_configurations (
  source_id, source_type, name, config, encrypted_credentials, is_active, version, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'RSS',
  'Crypto Briefing',
  '{"feedUrl": "https://cryptobriefing.com/feed", "updateInterval": 3600, "categories": ["bitcoin", "ethereum", "defi", "blockchain"], "language": "en", "maxItems": 50, "timeout": 30000}'::jsonb,
  NULL,
  true,
  0,
  NOW(),
  NOW()
);

-- 6. Crypto.News
INSERT INTO source_configurations (
  source_id, source_type, name, config, encrypted_credentials, is_active, version, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'RSS',
  'Crypto.News',
  '{"feedUrl": "https://crypto.news/feed", "updateInterval": 3600, "categories": ["bitcoin", "ethereum", "altcoin", "nft", "defi", "metaverse"], "language": "en", "maxItems": 50, "timeout": 30000}'::jsonb,
  NULL,
  true,
  0,
  NOW(),
  NOW()
);

-- 7. TheBitcoinNews
INSERT INTO source_configurations (
  source_id, source_type, name, config, encrypted_credentials, is_active, version, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'RSS',
  'TheBitcoinNews',
  '{"feedUrl": "https://thebitcoinnews.com/feed", "updateInterval": 3600, "categories": ["bitcoin", "blockchain", "cryptocurrency"], "language": "en", "maxItems": 50, "timeout": 30000}'::jsonb,
  NULL,
  true,
  0,
  NOW(),
  NOW()
);

-- 8. TronWeekly
INSERT INTO source_configurations (
  source_id, source_type, name, config, encrypted_credentials, is_active, version, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'RSS',
  'TronWeekly',
  '{"feedUrl": "https://tronweekly.com/feed", "updateInterval": 3600, "categories": ["tron", "trx", "ripple", "bitcoin", "blockchain"], "language": "en", "maxItems": 50, "timeout": 30000}'::jsonb,
  NULL,
  true,
  0,
  NOW(),
  NOW()
);

-- 9. Cryptogiggle
INSERT INTO source_configurations (
  source_id, source_type, name, config, encrypted_credentials, is_active, version, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'RSS',
  'Cryptogiggle',
  '{"feedUrl": "https://cryptogiggle.com/feed", "updateInterval": 3600, "categories": ["crypto", "memes", "news", "moonshots"], "language": "en", "maxItems": 50, "timeout": 30000}'::jsonb,
  NULL,
  true,
  0,
  NOW(),
  NOW()
);

-- 10. Bitfinex Blog
INSERT INTO source_configurations (
  source_id, source_type, name, config, encrypted_credentials, is_active, version, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'RSS',
  'Bitfinex Blog',
  '{"feedUrl": "https://blog.bitfinex.com/feed", "updateInterval": 3600, "categories": ["bitcoin", "litecoin", "ethereum", "trading"], "language": "en", "maxItems": 50, "timeout": 30000}'::jsonb,
  NULL,
  true,
  0,
  NOW(),
  NOW()
);

-- 11. BitcoinEthereumNews
INSERT INTO source_configurations (
  source_id, source_type, name, config, encrypted_credentials, is_active, version, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'RSS',
  'BitcoinEthereumNews',
  '{"feedUrl": "https://bitcoinethereumnews.com/feed", "updateInterval": 3600, "categories": ["bitcoin", "ethereum", "crypto", "blockchain", "economy"], "language": "en", "maxItems": 50, "timeout": 30000}'::jsonb,
  NULL,
  true,
  0,
  NOW(),
  NOW()
);

-- 12. U.Today
INSERT INTO source_configurations (
  source_id, source_type, name, config, encrypted_credentials, is_active, version, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'RSS',
  'U.Today',
  '{"feedUrl": "https://u.today/rss", "updateInterval": 3600, "categories": ["blockchain", "crypto", "news", "analysis"], "language": "en", "maxItems": 50, "timeout": 30000}'::jsonb,
  NULL,
  true,
  0,
  NOW(),
  NOW()
);

-- 13. News.Bitcoin
INSERT INTO source_configurations (
  source_id, source_type, name, config, encrypted_credentials, is_active, version, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'RSS',
  'News.Bitcoin',
  '{"feedUrl": "https://news.bitcoin.com/feed", "updateInterval": 3600, "categories": ["bitcoin", "economy", "exchange", "regulation"], "language": "en", "maxItems": 50, "timeout": 30000}'::jsonb,
  NULL,
  true,
  0,
  NOW(),
  NOW()
);

-- 14. Blockchain.News
INSERT INTO source_configurations (
  source_id, source_type, name, config, encrypted_credentials, is_active, version, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'RSS',
  'Blockchain.News',
  '{"feedUrl": "https://blockchain.news/rss", "updateInterval": 3600, "categories": ["bitcoin", "ethereum", "blockchain", "crypto"], "language": "en", "maxItems": 50, "timeout": 30000}'::jsonb,
  NULL,
  true,
  0,
  NOW(),
  NOW()
);

-- 15. CoinGeek
INSERT INTO source_configurations (
  source_id, source_type, name, config, encrypted_credentials, is_active, version, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'RSS',
  'CoinGeek',
  '{"feedUrl": "https://coingeek.com/feed", "updateInterval": 3600, "categories": ["bitcoin", "blockchain", "news"], "language": "en", "maxItems": 50, "timeout": 30000}'::jsonb,
  NULL,
  true,
  0,
  NOW(),
  NOW()
);

-- 16. BitMEX Blog
INSERT INTO source_configurations (
  source_id, source_type, name, config, encrypted_credentials, is_active, version, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'RSS',
  'BitMEX Blog',
  '{"feedUrl": "https://blog.bitmex.com/feed", "updateInterval": 3600, "categories": ["crypto", "derivatives", "trading"], "language": "en", "maxItems": 50, "timeout": 30000}'::jsonb,
  NULL,
  true,
  0,
  NOW(),
  NOW()
);

-- 17. AMB Crypto
INSERT INTO source_configurations (
  source_id, source_type, name, config, encrypted_credentials, is_active, version, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'RSS',
  'AMB Crypto',
  '{"feedUrl": "https://ambcrypto.com/feed", "updateInterval": 3600, "categories": ["bitcoin", "crypto", "news"], "language": "en", "maxItems": 50, "timeout": 30000}'::jsonb,
  NULL,
  true,
  0,
  NOW(),
  NOW()
);

-- 18. Decrypt
INSERT INTO source_configurations (
  source_id, source_type, name, config, encrypted_credentials, is_active, version, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'RSS',
  'Decrypt',
  '{"feedUrl": "https://decrypt.co/feed", "updateInterval": 3600, "categories": ["bitcoin", "ethereum", "blockchain", "news"], "language": "en", "maxItems": 50, "timeout": 30000}'::jsonb,
  NULL,
  true,
  0,
  NOW(),
  NOW()
);

-- 19. Blockonomi
INSERT INTO source_configurations (
  source_id, source_type, name, config, encrypted_credentials, is_active, version, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'RSS',
  'Blockonomi',
  '{"feedUrl": "https://blockonomi.com/feed", "updateInterval": 3600, "categories": ["bitcoin", "cryptocurrency", "fintech", "blockchain"], "language": "en", "maxItems": 50, "timeout": 30000}'::jsonb,
  NULL,
  true,
  0,
  NOW(),
  NOW()
);

-- Verify insertion
SELECT source_id, name, source_type, is_active 
FROM source_configurations 
WHERE source_type = 'RSS' 
ORDER BY name;
