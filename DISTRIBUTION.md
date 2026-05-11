# Distribuicao Desktop

Este projeto continua rodando normalmente no navegador local:

```bash
npm.cmd run dev
```

Para rodar como aplicativo desktop em modo desenvolvimento:

```bash
npm.cmd run desktop:dev
```

Para gerar o instalador Windows:

```bash
npm.cmd run desktop:build
```

Arquivos gerados:

- Instalador: `src-tauri/target/release/bundle/nsis/Card Editor_0.1.0_x64-setup.exe`
- Executavel release: `src-tauri/target/release/card-editor.exe`

Dependencias necessarias somente na maquina de build:

- Node.js/npm
- Rust via Rustup
- Visual Studio Build Tools 2022 com C++ workload

O usuario final nao precisa instalar Node, Rust ou Tauri.
