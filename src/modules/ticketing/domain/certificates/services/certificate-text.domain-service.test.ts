import { describe, expect, it } from "vitest";
import {
  CertificateTextDomainService,
  cleanCertificateSpaces,
  interpolateCertificateTemplate,
  sanitizeCertificateFilename,
  toSmartCertificateTitleCase,
} from "./certificate-text.domain-service";

describe("CertificateTextDomainService", () => {
  it("padroniza nomes com Smart Title Case preservando preposições", () => {
    expect(
      toSmartCertificateTitleCase({
        value: "  CARLOS   ESTEFANO DA SILVA   E SOUZA  ",
      }),
    ).toBe("Carlos Estefano da Silva e Souza");

    expect(
      toSmartCertificateTitleCase({
        value: "daiana dos santos de oliveira",
      }),
    ).toBe("Daiana dos Santos de Oliveira");
  });

  it("remove espaços extras e sanitiza nomes de arquivos", () => {
    expect(cleanCertificateSpaces({ value: "  João   Maria  " })).toBe(
      "João Maria",
    );
    expect(
      sanitizeCertificateFilename({ value: "Certificado: João / Maria?*" }),
    ).toBe("Certificado_João_Maria");
  });

  it("interpola variáveis nativas e customizadas do formulário", () => {
    const service = new CertificateTextDomainService();
    const result = service.execute({
      template:
        "Certificamos que {{nome}} (CPF {{cpf}}) da {{empresa}} concluiu {{evento}} ({{carga_horaria}}) - Matrícula {{Matrícula}} - Código {{codigo_autenticacao}}",
      variables: {
        nome: "Maria Clara da Rocha",
        email: "maria@exemplo.com",
        cpf: "123.456.789-00",
        empresa: "Prefeitura Municipal",
        cargo: "Analista",
        evento: "Congresso de Gestão Pública",
        data_evento: "16/11/2026",
        carga_horaria: "16 horas",
        codigo_autenticacao: "CERT-2026-ABCD1234",
        customVars: {
          Matrícula: "998877",
        },
      },
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.text).toBe(
      "Certificamos que Maria Clara da Rocha (CPF 123.456.789-00) da Prefeitura Municipal concluiu Congresso de Gestão Pública (16 horas) - Matrícula 998877 - Código CERT-2026-ABCD1234",
    );
  });

  it("substitui variáveis ausentes por string vazia sem quebrar", () => {
    expect(
      interpolateCertificateTemplate({
        template: "Olá {{nome}} {{inexistente}}",
        variables: {
          nome: "Pedro",
          email: "pedro@teste.com",
        },
      }),
    ).toBe("Olá Pedro ");
  });
});
