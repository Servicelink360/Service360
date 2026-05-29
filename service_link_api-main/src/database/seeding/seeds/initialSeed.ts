import { Factory, Seeder } from "typeorm-seeding";
import { Connection } from "typeorm";
import { User } from "../../../users/entities/user.entity";
export default class InitialDatabaseSeed implements Seeder {

   
    public async run(factory: Factory, connection: Connection): Promise<void> {
        // await factory(User)().createMany(2);
        const users = [];
        await connection.getRepository(User).save(users)
    }



}