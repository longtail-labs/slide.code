import * as Drizzle from 'drizzle-orm'
import * as DrizzleSqlite from 'drizzle-orm/sqlite-core'
import { Schema } from 'effect'

// #region Core utility types
// Simplified JSON types to prevent inference explosion
type JsonPrimitive = string | number | boolean | null
type JsonObject = { readonly [key: string]: unknown } // Match Schema.Record output
type JsonArray = readonly unknown[] // Match Schema.Array output
type JsonValue = JsonPrimitive | JsonObject | JsonArray

// For cases where you need full JSON validation, use this explicit version
export const JsonValue = Schema.Union(
  Schema.String,
  Schema.Number,
  Schema.Boolean,
  Schema.Null,
  Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  Schema.Array(Schema.Unknown)
) satisfies Schema.Schema<JsonValue>

// #endregion

// #region Schema building functions

/**
 * Creates an `Effect.Schema` for inserting data into a Drizzle table.
 *
 * It makes columns optional if they are nullable or have a database-side default value.
 *
 * @param table The Drizzle table definition.
 * @returns An `Effect.Schema` for insert operations.
 */
export function createInsertSchema<TTable extends Drizzle.Table>(
  table: TTable
): Schema.Schema<Drizzle.InferInsertModel<TTable>> {
  const columns = Drizzle.getTableColumns(table)
  const columnEntries = Object.entries(columns)

  const schemaEntries: Record<string, Schema.Schema.All | Schema.PropertySignature.All> =
    Object.fromEntries(columnEntries.map(([name, column]) => [name, mapColumnToSchema(column)]))

  // Apply insert-specific optionality rules
  for (const [name, column] of columnEntries) {
    if (!column.notNull) {
      schemaEntries[name] = Schema.optional(Schema.NullOr(schemaEntries[name] as Schema.Schema.All))
    } else if (column.hasDefault) {
      schemaEntries[name] = Schema.optional(schemaEntries[name] as Schema.Schema.All)
    }
  }

  return Schema.Struct(schemaEntries) as any
}

/**
 * Creates an `Effect.Schema` for selecting data from a Drizzle table.
 *
 * It makes columns nullable if they are nullable in the database.
 *
 * @param table The Drizzle table definition.
 * @returns An `Effect.Schema` for select operations.
 */
export function createSelectSchema<TTable extends Drizzle.Table>(
  table: TTable
): Schema.Schema<Drizzle.InferSelectModel<TTable>> {
  const columns = Drizzle.getTableColumns(table)
  const columnEntries = Object.entries(columns)

  const schemaEntries: Record<string, Schema.Schema.All | Schema.PropertySignature.All> =
    Object.fromEntries(columnEntries.map(([name, column]) => [name, mapColumnToSchema(column)]))

  // Apply select-specific nullability rules
  for (const [name, column] of columnEntries) {
    if (!column.notNull) {
      schemaEntries[name] = Schema.NullOr(schemaEntries[name] as Schema.Schema.All)
    }
  }

  return Schema.Struct(schemaEntries) as any
}

// #endregion

// #region Column mapping helpers

function hasMode(column: any): column is { mode: string } {
  return typeof column === 'object' && column !== null && 'mode' in column
}

function mapColumnToSchema(column: Drizzle.Column): Schema.Schema<any, any> {
  let type: Schema.Schema<any, any> | undefined

  if (isWithEnum(column)) {
    type = column.enumValues.length ? Schema.Literal(...column.enumValues) : Schema.String
  }

  if (!type) {
    if (column.dataType === 'custom') {
      type = Schema.Any
    } else if (column.dataType === 'json') {
      type = JsonValue
    } else if (column.dataType === 'array') {
      // Drizzle's sqlite-core does not have native array types, so this case is unlikely
      type = Schema.Array(Schema.Unknown)
    } else if (column.dataType === 'number') {
      type = Schema.Number
    } else if (column.dataType === 'bigint') {
      type = Schema.BigIntFromSelf
    } else if (column.dataType === 'boolean') {
      type = Schema.Boolean
    } else if (column.dataType === 'date') {
      type = hasMode(column) && column.mode === 'string' ? Schema.String : Schema.DateFromSelf
    } else if (column.dataType === 'string') {
      let sType = Schema.String
      if (Drizzle.is(column, DrizzleSqlite.SQLiteText) && typeof column.length === 'number') {
        sType = sType.pipe(Schema.maxLength(column.length))
      }
      type = sType
    }
  }

  if (!type) {
    type = Schema.Any // fallback
  }

  return type
}

function isWithEnum(
  column: Drizzle.Column
): column is typeof column & { enumValues: [string, ...string[]] } {
  return 'enumValues' in column && Array.isArray(column.enumValues) && column.enumValues.length > 0
}

// #endregion
