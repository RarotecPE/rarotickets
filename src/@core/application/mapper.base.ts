export abstract class Mapper<Input, Output> {
  abstract map(input: Input): Output;
}
