import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PersoneeService } from '../personeeSERVICE/personee.service';
import { DTOPERSONNEVALENTANO } from '../DTO.PERSONNE.VALENTANO';
import { PersonneValentano } from '../SECHEMA.PERSONNE.VALENTANO';
import { Request, Response } from 'express';
import * as escapeHtml from 'escape-html';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as arp from 'node-arp';
import { DtoLoginPersonne } from '../DtoLoginPersonne';
import { JwtAuthGuard } from 'src/AuthFile/auth.Gurad.Local';
import axios from 'axios';
import { AuthGuard } from '@nestjs/passport';


const execPromise = promisify(exec);

@Controller('VALENTANO')

export class PersonneControllerController {
  constructor(private readonly personneservice: PersoneeService) {}

  @Post('/create')
  async create(
    @Body() dtoPersonne,
    @Res() res: Response,
    @Req() request: Request,
  ): Promise<PersonneValentano | any> {
    console.log(request);
    

      const getIpModem=await axios.get('https://api.ipify.org?format=json')
      console.log(getIpModem?.data)
      
   
    const fixedParameter = uuidv4();
    console.log(fixedParameter);
    return this.personneservice
      .createPersonne({ dtoPersonne, fixedParameter })
      .then((e) => {
        if(e){

          res.json(e);
        }else{
          res.json(e)
        }  
      });
  }
 
  @Post('/login/')

  async personnelogin(@Body() login: DtoLoginPersonne,@Query() params:{lan:string,lg:string,keySecret:string}) {
    // console.log(verif)
    
    // console.log(login)
    const user = await this.personneservice.loginPersonne(login,params);
    console.log(user)
   
    return user
  } 

  @Patch('/prisence/:id')
  
  async ispresente(
    @Param('id') id,
    @Query('prise') prise: string,
    @Req() req: Request,
  ): Promise<any> {
    console.log(prise);
    const index = await this.personneservice.updatePresence(id, prise, req);
    return index;
  }

  @Post('/getPresence')
  // @UseGuards(JwtAuthGuard)
  async getAllPresence(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() request: Request,
    @Body() body,
  ) {
    // console.log(request);
    // const userAgent = request.headers['user-agent']
    // console.log(userAgent)
    // const token = request.headers.authorization?.replace('Bearer ', '');
    // console.log(token)

    const get = await this.personneservice.findAllPresence();

    res.json(get);
  }



  @Post('/all')
  async allPersonne (@Res() res:Response){
    const personne=await this.personneservice.findAllPersonne()
    res.json({data:personne})
  }
}
