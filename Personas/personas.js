// Clase Persona
class Persona {
    constructor(nombre, apellido, rango, dni, edad) {
        this.nombre = nombre;
        this.apellido = apellido;
        this.rango = rango;
        this.dni = dni;
        this.edad = edad;
    }

    // Método para mostrar información
    mostrarInfo() {
        return `Nombre: ${this.nombre} ${this.apellido}, Rango: ${this.rango}, DNI: ${this.dni}, Edad: ${this.edad}`;
    }
}

// Crear instancia de Persona
const comodoro = new Persona("Comodoro", "Primero", "Comodoro", 33333333, 22);
const mayor = new Persona("Mayor", "Segundo", "Mayor", 44444444, 32)
// Mostrar información en la consola
console.log(comodoro.mostrarInfo());
console.log(mayor.mostrarInfo())
// Exportar la clase y el objeto (opcional)
export { Persona, comodoro };