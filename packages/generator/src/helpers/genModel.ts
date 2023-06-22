import { DMMF } from "@prisma/generator-helper";
import { pascalCase, snakeCase } from "change-case";
import type ts from "typescript";

export const genModel = (model: DMMF.Model) => {
  // TODO: Handle more uniqueness scenarios. At least handling a singular unique index/constraint should be okay.
  const pk = model.fields.find((f) => f.isId);

  if (!pk) {
    // skip this scenario for now.
    return [null, null];
  }

  const pkName = pk.name;
  const pkType = scalarToTS(pk.type);
  console.log(pkType);

  const modelName = model.name;
  const modelPascalCase = pascalCase(modelName);
  const modelSnakeCase = snakeCase(modelName);
  const maybeIntPipe = pkType === "number" ? ", ParseIntPipe" : "";

  return [
    modelSnakeCase,
    `
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma, ${modelName} } from '@prisma/client';

@Injectable()
export class ${modelPascalCase}Service {
  constructor(private readonly prisma: PrismaService) { }

  async getAll(): Promise<${modelName}[]>  {
    return await this.prisma.${modelName}.findMany();
  }

  async getOne(id: ${pkType}): Promise<${modelName}> {
    return await this.prisma.${modelName}.findUnique({
      where: { ${pkName}: id }
});
  }

  async deleteOne(id: ${pkType}): Promise<${modelName}> {
    return await this.prisma.${modelName}.delete({
      where: { ${pkName}: id }
});
  }

  async updateOne(id: ${pkType}, data: ${modelName}): Promise<${modelName}> {
    return await this.prisma.${modelName}.upsert({
      create: data,
      update: data,
      where: { ${pkName}: id },
    });
  }

  async createOne(data: ${modelName}): Promise<${modelName}> {
    return await this.prisma.${modelName}.create({
      data: data
    });
  }
}
`,
    `
import { Module } from '@nestjs/common';
import { ${modelPascalCase}Controller } from './${modelSnakeCase}.controller';
import { ${modelPascalCase}Service } from './${modelSnakeCase}.service';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [${modelPascalCase}Controller],
  providers: [${modelPascalCase}Service, PrismaService],
  imports: [ConfigModule.forRoot(), HttpModule],
})
export class ${modelPascalCase}Module {}
`,
    `
import {
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Body,
  Delete,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { ${modelPascalCase}Service } from './${modelSnakeCase}.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@Controller('${modelSnakeCase}')
@ApiTags('${modelPascalCase}')
export class ${modelPascalCase}Controller {
  constructor(private readonly svc: ${modelPascalCase}Service) {}

  @Get('')
  getAll() {
    return this.svc.getAll();
  }

  @Get(':id')
  getOne(@Param('id' ${maybeIntPipe}) id: ${pkType}) {
    return this.svc.getOne(id);
  }

  @Delete(':id')
  deleteOne(@Param('id' ${maybeIntPipe}) id: ${pkType}) {
    return this.svc.deleteOne(id);
  }

  @Post('')
  createOne(@Body() newEntry) {
    return this.svc.createOne(newEntry);
  }

  @Post(':id')
  updateOne(@Param('id' ${maybeIntPipe}) id, @Body() updatedEntry: any) {
    return this.svc.updateOne(id, updatedEntry);
  }

  @Patch(':id')
  updateOnePatch(@Param('id' ${maybeIntPipe}) id, @Body() updatedEntry: any) {
    return this.svc.updateOne(id, updatedEntry);
  }
}
`,
  ];
};

// Snagged this from https://github.com/vegardit/prisma-generator-nestjs-dto/
// Thanks!

const PrismaScalarToTypeScript: Record<string, string> = {
  String: "string",
  Boolean: "boolean",
  Int: "number",
  // [Working with BigInt](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields#working-with-bigint)
  BigInt: "bigint",
  Float: "number",
  // [Working with Decimal](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields#working-with-decimal)
  Decimal: "Prisma.Decimal",
  DateTime: "Date",
  // [working with JSON fields](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields)
  Json: "Prisma.JsonValue",
  // [Working with Bytes](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields#working-with-bytes)
  Bytes: "Buffer",
};

const knownPrismaScalarTypes = Object.keys(PrismaScalarToTypeScript);

const scalarToTS = (scalar: string, useInputTypes = false): string => {
  if (!knownPrismaScalarTypes.includes(scalar)) {
    throw new Error(`Unrecognized scalar type: ${scalar}`);
  }

  // [Working with JSON fields](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields)
  // supports different types for input / output. `Prisma.InputJsonValue` extends `Prisma.JsonValue` with `undefined`
  if (useInputTypes && scalar === "Json") {
    return "Prisma.InputJsonValue";
  }

  return PrismaScalarToTypeScript[scalar];
};
