export type ToDomainParams<Model> = { record: Model };
export type ToPersistenceParams<Domain> = { entity: Domain };

export abstract class PersistenceMapper<Domain, Model, Data> {
  abstract toDomain(params: ToDomainParams<Model>): Domain;
  abstract toPersistence(params: ToPersistenceParams<Domain>): Data;
}
