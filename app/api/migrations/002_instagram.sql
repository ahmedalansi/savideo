-- Instagram: blocks data-centre IPs quickly, so it goes through the proxy when one is set.
insert into platforms (id, display_name, audio_supported, use_proxy) values
  ('instagram', 'Instagram', true, true)
on conflict (id) do nothing;
