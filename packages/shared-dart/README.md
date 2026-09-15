# shared-dart (Flutter API client)

Bu paket `apps/mobile` icin OpenAPI Generator (dart-dio) ile **uretilen** bir Dio client barindirir. Elle duzenlenmez.

## Uretim

```bash
pnpm --filter @yoklama/api openapi:dump
openapi-generator-cli generate \
  -i docs/api/openapi.json \
  -g dart-dio \
  -o packages/shared-dart \
  --additional-properties=pubName=yoklama_api_client
```

`apps/mobile/pubspec.yaml` bu paketi bir path dependency olarak referans alir:

```yaml
dependencies:
  yoklama_api_client:
    path: ../../packages/shared-dart
```

Not: bu README, gercek client kodu ilk kez `openapi-generator-cli` calistirildiginda uretilecegi icin simdilik bir yer tutucudur - `apps/api` calisir hale gelip ilk OpenAPI spec cikarildiktan sonra bu adim çalıştırılmalıdır.
