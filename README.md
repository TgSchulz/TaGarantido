# TáGarantido

Aplicativo React Native com Expo para importar notas fiscais XML e acompanhar as garantias dos produtos. A leitura, validação e persistência acontecem no próprio aparelho, sem API ou servidor.

## Executar o app

```powershell
cd tgd-app-mobile
npm install
npx expo start
```

Abra o QR code com o Expo Go compatível com o SDK do projeto, ou escolha um emulador Android/iOS pelo terminal do Expo.

## Como funciona

- A única entrada de dados é a seleção de um arquivo `.xml` pelo seletor nativo do aparelho.
- O app valida a estrutura do XML e extrai itens de NF-e, NFC-e ou NFS-e localmente.
- A data de início vem da data de emissão/compra identificada na nota. O importador procura datas finais e durações associadas a “garantia”, “validade” ou “warranty”, inclusive em `infAdProd` e `infCpl`.
- Se não encontrar uma data final, o card do produto permite escolhê-la no calendário do aparelho.
- Os registros são armazenados em SQLite no celular e continuam disponíveis após fechar ou reiniciar o app.
- O número da nota fica registrado localmente para impedir uma nova importação da mesma nota.
- O conteúdo original do XML não é guardado. O app salva somente os campos extraídos necessários para exibir as garantias.
- Os dados ficam no aparelho e não sincronizam automaticamente com outros dispositivos.

## Organização do app

```text
tgd-app-mobile/src/
├── components/   # Componentes da interface
├── hooks/        # Estado e ações reutilizáveis do domínio de garantias
├── screens/      # Telas e estado da interface
├── services/     # Leitura/validação de XML e acesso ao SQLite local
├── theme/        # Cores compartilhadas
├── types/        # Tipos dos registros locais
└── utils/        # Funções auxiliares
```

## Formatos XML

O importador reconhece itens de NF-e/NFC-e nos blocos `det/prod/xProd` e serviços da NFS-e Nacional em `serv/cServ/xDescServ`. Cada nota pode gerar mais de uma garantia. XML válido sem itens reconhecidos é recusado com uma mensagem para selecionar o XML completo da nota.

## Licença

Consulte [LICENSE](LICENSE).
