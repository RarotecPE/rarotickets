export abstract class Repository<Id, EntityType> {
  abstract findById(id: Id): Promise<EntityType | null>;
  abstract save(entity: EntityType): Promise<void>;
}
