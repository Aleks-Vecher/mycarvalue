import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { randomBytes, scrypt as _scrypt } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(_scrypt); //we us promisify as scrypt return callbacks but we need promis, it's easy

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

  async signup(email: string, password: string) {
    //1. See if email is in use
    const users = await this.usersService.find(email);
    if (users.length) {
      throw new BadRequestException('email in use');
    }

    //2. Hash the users password
    // 2.1 Generate a salt
    // 8 is mean bytes, 1 bytes is 2 letters in hex system (characters or numbers), in general it will be 16 letters string. randombytes return 0101010... then convert to hex ;ljhlkj
    const salt = randomBytes(8).toString('hex');

    // 2.2 Hash the salt and the password together
    // as Buffer - this is help for Typescript to undestand
    const hash = (await scrypt(password, salt, 32)) as Buffer;

    // 2.3 Join the hashed result and the salt together
    const result = salt + '.' + hash.toString('hex');

    //3. Create a new user and save it
    const user = await this.usersService.create(email, result);

    //4. return the user
    return user;
  }
  async signin(email: string, password: string) {
    const [user] = await this.usersService.find(email);
    if (!user) {
      throw new NotFoundException('user not found');
    }

    const [salt, storedHash] = user.password.split('.');
    const hash = (await scrypt(password, salt, 32)) as Buffer;
    if (storedHash !== hash.toString('hex')) {
      throw new BadRequestException('bad password');
    }
    
    return user;
  }
}
