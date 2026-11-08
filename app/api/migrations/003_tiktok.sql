-- TikTok: blocks data-centre IPs ("Your IP address is blocked"), so it goes through the proxy when one is set.
insert into platforms (id, display_name, audio_supported, use_proxy) values
  ('tiktok', 'TikTok', true, true)
on conflict (id) do nothing;
