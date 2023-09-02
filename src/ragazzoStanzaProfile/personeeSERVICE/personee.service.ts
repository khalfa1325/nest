import {
  Body,
  Injectable,
  Param,
  Patch,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PersonneValentano } from '../SECHEMA.PERSONNE.VALENTANO';
import { Model } from 'mongoose';
import * as escapeHtml from 'escape-html';
import { DTOPERSONNEVALENTANO } from '../DTO.PERSONNE.VALENTANO';
import { Prense } from '../TABLEAU.PRESENCE';
import * as bcrypt from 'bcrypt';
import { DtoLoginPersonne } from '../DtoLoginPersonne';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import * as pako from 'pako';
import { User } from 'src/AuthFile/userSchema/user.schema';
import axios from 'axios';
import * as dns from "dns"
@Injectable()
export class PersoneeService {
  constructor(
    @InjectModel('personneValentano')
    private readonly Personel: Model<PersonneValentano>,
    @InjectModel('presence') private readonly Prisence: Model<Prense>,
    private readonly jwt: JwtService,
    @InjectModel('user') private userModels: Model<User>,
  ) {

  }

  ////create personne vivie in casa valentano

  async createPersonne({ dtoPersonne, fixedParameter }) {
    let personne;
    console.log(dtoPersonne.email);
    const verifWithCodeFiscale = await this.Personel.findOne({
      email: dtoPersonne.email,////EMAIL EN REALITER CODEFISCALE DE TYPE STRING
    });
    console.log(verifWithCodeFiscale);
    try {
      if (verifWithCodeFiscale === null) {
        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(dtoPersonne.password, salt);
        personne = this.Personel.create({
          ...dtoPersonne,
          keySecret: fixedParameter,
          password: hashPassword,

        });
      }
      else if (verifWithCodeFiscale !== null) {
        personne = { message: 'user is existe dja' };
      }
    } catch (error) {
      throw new Error('error already exists.');
    }
    try {
      // const secretKey = process.env.SECRET_KEY
      // const cipher = crypto.createCipher('aes-256-cbc', secretKey);
      // const encryptedData = Buffer.concat([cipher.update(JSON.stringify(personne)), cipher.final()]).toString('hex');
      // console.log(encryptedData)
      return personne;
    } catch (error) {
      return personne
    }


  }

  async loginPersonne(login, params): Promise<{ token: string } | any> {
    let user
    console.log(params)
    const userLocation = await this.userModels.findOne({
      location: {
        $geoWithin: {
          $centerSphere: [[params.lan, params.lg], 0.15], // Convert maxDistance to radians
          // lan: '41.8904', lg: '12.5126'
        },
      },
    })
    console.log(userLocation)
    const getIpModem = await axios.get('https://ipinfo.io')
console.log(getIpModem)
    const veirfyuser = await this.userModels.findOne({ Modemip: getIpModem?.data.ip })

    console.log(veirfyuser)

 
 
    if (veirfyuser === null) {
      return user = ({ message: 'return to centro ou bien attendre permission de loperateur' })
    } else {
      user = await this.Personel.findOne({
        email: login.email,////en reatliter is e codishe fiscale
      });
      if (!user) {
        throw new UnauthorizedException('invalide codefischale or password');
      }

    

      if (user.keySecret === params?.keySecret) {
       


        const passwordMatch = await bcrypt.compare(login.password, user.password);
        if (!passwordMatch) {
          throw new UnauthorizedException('invalide  password');
        }
        console.log(user.Idoperatore.includes(userLocation._id))
        if (user.Idoperatore.includes(userLocation._id) === false) {


          user = await this.Personel.findOneAndUpdate({ _id: user._id }, { $push: { Idoperatore: userLocation._id } }, { new: true }).
            populate({ path: 'Idoperatore' })

        } 
        console.log(userLocation.Ragazzo.includes(user._id))
        if (userLocation.Ragazzo.includes(user._id) === false) {
          await this.userModels.findOneAndUpdate({ _id: userLocation._id }, { $push: { Ragazzo: user._id } }, { new: true })
        }

        const token = this.jwt.sign({
          email: login.email,
          password: login.password,
        });
        console.log(token)
        // res.cookie('token', token)
        console.log('conncet seccs')
        return { token, user };
      }else {
        if(params.keySecret==='undefined'){
            return this.Personel.findOneAndDelete({_id:user._id}).select('name lastName email')
        }else{

          throw new UnauthorizedException('please conncet with your phone');

        }
        
      }
    }



    // return user
  }

  async updatePresence(id: string, prise: string, req): Promise<any> {
    // console.log(id);
    console.log(req);
    const verifeIp = await this.Personel.findOne({ _id: id });
    console.log(verifeIp);
    const verif = await this.Prisence.findOne(
      { personne: id },
      { prsence: { $slice: -1 } },
    );
    console.log(verif);
    let persone;
    const ifexiste = await this.Prisence.findOne({ personne: id });
    // console.log(ifexiste)

    const day = new Date().getDate();
    const month = new Date().getMonth() + 1; // Months are zero-indexed
    const year = new Date().getFullYear();
    const dateNow = day / month / year;
    // console.log(dateNow)
    if (ifexiste === null) {
      const index = {
        personne: id,
        prsence: prise,
      };
      const h = await this.Prisence.create(index);
      // console.log(h)
      persone = (
        await this.Personel.findOneAndUpdate(
          { _id: id },
          { $push: { isPresent: h._id } },
          { new: true },
        )
      ).populate({ path: 'isPresent', populate: { path: 'personne' } });
    } else {
      const pr = await this.Prisence.find();
      const last = pr[pr.length - 1];
      const datePD = last.date.getDate();
      const datePM = last.date.getMonth() + 1;
      const datePFR = last.date.getFullYear();
      const dateDATA = datePD / datePM / datePFR;
      // console.log(dateDATA)
      if (dateDATA !== dateNow) {
        const index = {
          personne: id,
          prsence: prise,
        };
        const h = await this.Prisence.create(index);
        // console.log(h)
        persone = (
          await this.Personel.findOneAndUpdate(
            { _id: id },
            { $push: { isPresent: h._id } },
            { new: true },
          )
        ).populate({ path: 'isPresent' });
      } else {
        const pr = await this.Prisence.find();
        const last = pr[pr.length - 1];
        console.log(last);
        if (last.prsence !== prise) {
          persone = await this.Prisence.findOneAndUpdate(
            { _id: last._id },
            { $set: { prsence: prise } },
            { new: true },
          );
        }
        persone = await this.Personel.findOne({ _id: id }).populate({
          path: 'isPresent',
        });
      }
    }
    // console.log(persone)
    return persone;
  }
  // async deletePresence(id: string): Promise<any> {
  //     return this.Prisence.findOneAndDelete({ _id: id })
  // }
  async findAllPersonne() {
    const all = await this.Personel.find()
    // const secretKey = process.env.SECRET_KEY
    // const cipher = crypto.createCipher('aes-256-cbc', secretKey);

    // const encryptedData = Buffer.concat([cipher.update(JSON.stringify(all)), cipher.final()]).toString('hex');

    return all

  }
  async findAllPresence() {
    const presenceById = await this.Prisence.find();
    // console.log(presenceById);
    // const secretKey = process.env.SECRET_KEY
    // console.log(secretKey)
    // const cipher = crypto.createCipher('aes-256-cbc', secretKey);
    // const encryptedData = Buffer.concat([cipher.update(JSON.stringify(presenceById)), cipher.final()]).toString('hex');
    // // console.log(encryptedData)

    return presenceById;
  }



}
